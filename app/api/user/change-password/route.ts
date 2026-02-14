import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, createDEKToken, getDEKCookieOptions } from '@/lib/auth';
import { verifyPassword, hashPassword, validatePassword } from '@/lib/auth';
import { deriveKEK, unwrapDEK, wrapDEK, decryptNote, encryptNote, EncryptedData, generateSalt, getDefaultKDFParams } from '@/lib/encryption';
import { getDEK, cacheDEK } from '@/lib/dek-cache';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmNewPassword } = body;

    // Validate inputs
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json(
        { error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if new password is same as current password
    const isSamePassword = await verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Get current password version to increment it
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordVersion: true },
    });

    const newPasswordVersion = (currentUser?.passwordVersion || 0) + 1;

    // Check if user has encryption enabled and re-wrap DEK if so
    const userWithEncryption = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        encryptionSalt: true,
        wrappedDek: true,
        kdfIterations: true,
        kdfMemoryCost: true,
        kdfParallelism: true,
      },
    });

    let dekToken: string | null = null;

    if (userWithEncryption?.encryptionSalt && userWithEncryption?.wrappedDek) {
      try {
        // Unwrap existing DEK using old password
        const oldKEK = await deriveKEK(currentPassword, userWithEncryption.encryptionSalt, {
          iterations: userWithEncryption.kdfIterations ?? undefined,
          memoryCost: userWithEncryption.kdfMemoryCost ?? undefined,
          parallelism: userWithEncryption.kdfParallelism ?? undefined,
        });

        const oldWrappedDEK: EncryptedData = JSON.parse(userWithEncryption.wrappedDek);
        const dek = unwrapDEK(oldWrappedDEK, oldKEK);

        // Generate new salt and derive new KEK
        const newSalt = generateSalt();
        const kdfParams = {
          iterations: userWithEncryption.kdfIterations ?? getDefaultKDFParams().iterations,
          memoryCost: userWithEncryption.kdfMemoryCost ?? getDefaultKDFParams().memoryCost,
          parallelism: userWithEncryption.kdfParallelism ?? getDefaultKDFParams().parallelism,
        };

        const newKEK = await deriveKEK(newPassword, newSalt, kdfParams);
        const newWrappedDEK = wrapDEK(dek, newKEK);

        // Find all encrypted notes and re-encrypt them
        const encryptedNotes = await prisma.note.findMany({
          where: {
            canvas: { userId: session.userId },
            isEncrypted: true,
          },
        });

        console.log(`[Password Change] Re-encrypting ${encryptedNotes.length} notes for user ${session.userId}`);

        // Re-encrypt each note in batches for better performance
        const batchSize = 50;
        for (let i = 0; i < encryptedNotes.length; i += batchSize) {
          const batch = encryptedNotes.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(async (note) => {
              try {
                // Decrypt with old DEK
                const decrypted = decryptNote(note.title, note.content, dek);
                // Re-encrypt with same DEK (DEK doesn't change, only the KEK wrapping changes)
                const reEncrypted = encryptNote(decrypted.title, decrypted.content, dek);
                
                await prisma.note.update({
                  where: { id: note.id },
                  data: {
                    title: reEncrypted.encryptedTitle,
                    content: reEncrypted.encryptedContent,
                  },
                });
              } catch (encryptError) {
                console.error(`[Password Change] Failed to re-encrypt note ${note.id}:`, encryptError);
              }
            })
          );
        }

        // Update user with new wrapped DEK
        await prisma.user.update({
          where: { id: session.userId },
          data: {
            encryptionSalt: newSalt,
            wrappedDek: JSON.stringify(newWrappedDEK),
          },
        });

        // Cache the DEK and create token for response
        cacheDEK(session.userId, dek);
        dekToken = createDEKToken(dek);

        console.log(`[Password Change] Successfully re-encrypted ${encryptedNotes.length} notes`);
      } catch (encryptionError) {
        console.error('[Password Change] Failed to re-encrypt notes:', encryptionError);
        // Continue with password change even if encryption re-wrapping fails
        // The user will need to re-login to get a new DEK
      }
    }

    // Update user password and increment password version
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: newPasswordHash,
        passwordVersion: newPasswordVersion,
      },
    });

    // Create response
    const response = NextResponse.json({
      message: 'Password changed successfully',
      passwordVersion: newPasswordVersion,
      encryptionReencrypted: !!dekToken,
    });

    // Update DEK cookie if we have a new token
    if (dekToken) {
      response.cookies.set('dek_token', dekToken, getDEKCookieOptions());
    }

    return response;
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'An error occurred while changing your password' },
      { status: 500 }
    );
  }
}
