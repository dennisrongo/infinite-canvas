import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword, createDEKToken, getDEKCookieOptions } from '@/lib/auth';
import { generateSalt, deriveKEK, wrapDEK, generateDEK, EncryptedData, getDefaultKDFParams } from '@/lib/encryption';
import { cacheDEK } from '@/lib/dek-cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (resetToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Prepare update data
    const updateData: any = { passwordHash };

    // Store DEK token for response cookie
    let dekToken: string | null = null;

    // Re-wrap DEK if user has encryption enabled
    const user = resetToken.user;
    if (user.encryptionSalt && user.wrappedDek) {
      try {
        // Generate new salt for the new password
        const newSalt = generateSalt();
        const kdfParams = {
          iterations: user.kdfIterations ?? getDefaultKDFParams().iterations,
          memoryCost: user.kdfMemoryCost ?? getDefaultKDFParams().memoryCost,
          parallelism: user.kdfParallelism ?? getDefaultKDFParams().parallelism,
        };

        // Derive new KEK from new password
        const newKEK = await deriveKEK(password, newSalt, kdfParams);

        // We need to unwrap the existing DEK with the old password
        // However, in password reset flow, we don't have the old password
        // So we need to use the token to verify identity, then we can generate a new DEK
        // This means old encrypted notes will need to be re-encrypted

        // For now, let's generate a new DEK and wrap it with the new password
        // This is a limitation - old encrypted notes will become inaccessible
        // A better approach would be to ask for the old password during reset

        // Generate new DEK
        const newDEK = generateDEK();

        // Wrap new DEK with new KEK
        const wrappedDEK = wrapDEK(newDEK, newKEK);

        updateData.encryptionSalt = newSalt;
        updateData.wrappedDek = JSON.stringify(wrappedDEK);

        // Cache the new DEK
        cacheDEK(user.id, newDEK);
        dekToken = createDEKToken(newDEK);
      } catch (encryptionError) {
        console.error('Failed to re-wrap DEK during password reset:', encryptionError);
        // Continue with password reset, but encryption will need to be re-initialized
      }
    }

    // Update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: updateData,
    });

    // Delete the reset token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    const response = NextResponse.json({
      message: 'Password has been reset successfully',
    });

    // Set DEK cookie if we have one
    if (dekToken) {
      response.cookies.set('dek_token', dekToken, getDEKCookieOptions());
    }

    return response;
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    );
  }
}
