import type { AccessLevel } from '../shared/schema'

export const INITIAL_DEPARTMENT_ACCESS_LEVELS = [
  { name: 'Administration', accessLevel: 4 },
  { name: 'IT', accessLevel: 3 },
  { name: 'Marketing', accessLevel: 2 },
  { name: 'Ressources Humaines', accessLevel: 3 },
  { name: 'Comptabilité', accessLevel: 3 },
  { name: 'Test Department', accessLevel: 1 },
] as const satisfies ReadonlyArray<{ name: string; accessLevel: AccessLevel }>

export interface DepartmentAccessLevelState {
  id: number
  name: string
  accessLevel: number | null
}

export interface DepartmentAccessLevelPlan {
  assignments: Array<{ id: number; name: string; accessLevel: AccessLevel }>
  candidates: Array<{ id: number; name: string; accessLevel: AccessLevel }>
  alreadyInitialized: number
}

export function buildDepartmentAccessLevelPlan(
  departments: DepartmentAccessLevelState[],
): DepartmentAccessLevelPlan {
  const expectedNames = new Set<string>(INITIAL_DEPARTMENT_ACCESS_LEVELS.map((entry) => entry.name))
  const actualNames = new Set(departments.map((department) => department.name))

  if (
    departments.length !== INITIAL_DEPARTMENT_ACCESS_LEVELS.length ||
    actualNames.size !== departments.length ||
    INITIAL_DEPARTMENT_ACCESS_LEVELS.some((entry) => !actualNames.has(entry.name)) ||
    departments.some((department) => !expectedNames.has(department.name))
  ) {
    throw new Error('Les départements existants ne correspondent pas exactement à la grille approuvée.')
  }

  const byName = new Map(departments.map((department) => [department.name, department]))
  const assignments = INITIAL_DEPARTMENT_ACCESS_LEVELS.map((expected) => {
    const department = byName.get(expected.name)
    if (!department) {
      throw new Error('Un département approuvé est absent de la base active.')
    }
    if (department.accessLevel !== null && department.accessLevel !== expected.accessLevel) {
      throw new Error(`Le département ${expected.name} possède déjà un niveau différent.`)
    }
    return {
      id: department.id,
      name: expected.name,
      accessLevel: expected.accessLevel,
    }
  })

  return {
    assignments,
    candidates: assignments.filter((assignment) => byName.get(assignment.name)?.accessLevel === null),
    alreadyInitialized: assignments.filter(
      (assignment) => byName.get(assignment.name)?.accessLevel === assignment.accessLevel,
    ).length,
  }
}
