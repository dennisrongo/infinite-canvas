/**
 * Unit tests for query key factories
 */

import { describe, it, expect } from 'vitest'
import { canvasKeys, folderKeys, userKeys, searchKeys, authKeys } from '../queryKeys'

describe('canvasKeys', () => {
  it('should return stable "all" key', () => {
    expect(canvasKeys.all).toEqual(['canvases'])
    expect(canvasKeys.all).toBe(canvasKeys.all) // referential stability
  })

  it('should return detail key with id', () => {
    expect(canvasKeys.detail('abc')).toEqual(['canvases', 'abc'])
  })

  it('should return notes key with canvasId', () => {
    expect(canvasKeys.notes('abc')).toEqual(['canvases', 'abc', 'notes'])
  })

  it('should return connections key with canvasId', () => {
    expect(canvasKeys.connections('abc')).toEqual(['canvases', 'abc', 'connections'])
  })

  it('should produce different keys for different ids', () => {
    expect(canvasKeys.detail('a')).not.toEqual(canvasKeys.detail('b'))
  })
})

describe('folderKeys', () => {
  it('should return stable "all" key', () => {
    expect(folderKeys.all).toEqual(['folders'])
    expect(folderKeys.all).toBe(folderKeys.all)
  })
})

describe('userKeys', () => {
  it('should return stable "me" key', () => {
    expect(userKeys.me).toEqual(['user', 'me'])
    expect(userKeys.me).toBe(userKeys.me)
  })

  it('should return stable "settings" key', () => {
    expect(userKeys.settings).toEqual(['user', 'settings'])
  })
})

describe('searchKeys', () => {
  it('should return results key with query', () => {
    expect(searchKeys.results('hello')).toEqual(['search', 'hello', undefined])
  })

  it('should return results key with query and filters', () => {
    const filters = { sortBy: 'title' }
    expect(searchKeys.results('hello', filters)).toEqual(['search', 'hello', { sortBy: 'title' }])
  })

  it('should produce different keys for different queries', () => {
    expect(searchKeys.results('a')).not.toEqual(searchKeys.results('b'))
  })
})

describe('authKeys', () => {
  it('should return stable "csrf" key', () => {
    expect(authKeys.csrf).toEqual(['auth', 'csrf'])
    expect(authKeys.csrf).toBe(authKeys.csrf)
  })
})
