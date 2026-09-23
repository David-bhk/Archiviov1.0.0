import { describe, expect, it } from 'vitest'

import {
  buildDepartmentAccessLevelPlan,
  INITIAL_DEPARTMENT_ACCESS_LEVELS,
} from './department-access-level-initialization'

function departments(accessLevel: number | null = null) {
  return INITIAL_DEPARTMENT_ACCESS_LEVELS.map((entry, index) => ({
    id: index + 1,
    name: entry.name,
    accessLevel,
  }))
}

describe('buildDepartmentAccessLevelPlan', () => {
  it('prépare exactement les six niveaux approuvés', () => {
    const plan = buildDepartmentAccessLevelPlan(departments())

    expect(plan.candidates).toHaveLength(6)
    expect(plan.alreadyInitialized).toBe(0)
    expect(plan.assignments.map(({ name, accessLevel }) => ({ name, accessLevel }))).toEqual(
      INITIAL_DEPARTMENT_ACCESS_LEVELS,
    )
  })

  it('refuse un département manquant, supplémentaire ou renommé', () => {
    expect(() => buildDepartmentAccessLevelPlan(departments().slice(0, 5))).toThrow('exactement')
    expect(() => buildDepartmentAccessLevelPlan([
      ...departments(),
      { id: 7, name: 'Autre', accessLevel: null },
    ])).toThrow('exactement')
  })

  it('reste idempotent mais refuse une valeur déjà contradictoire', () => {
    const initialized = INITIAL_DEPARTMENT_ACCESS_LEVELS.map((entry, index) => ({
      id: index + 1,
      name: entry.name,
      accessLevel: entry.accessLevel,
    }))
    expect(buildDepartmentAccessLevelPlan(initialized)).toMatchObject({
      candidates: [],
      alreadyInitialized: 6,
    })

    const conflicting = departments()
    conflicting[0].accessLevel = 1
    expect(() => buildDepartmentAccessLevelPlan(conflicting)).toThrow('niveau différent')
  })
})
