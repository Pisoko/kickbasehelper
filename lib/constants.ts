// Constants for the Kickbase Helper application

// Available formations for team optimization
export const FORMATION_LIST = [
  '4-4-2',
  '4-2-4', 
  '3-4-3',
  '4-3-3',
  '5-3-2',
  '3-5-2',
  '5-4-1',
  '4-5-1',
  '3-6-1',
  '5-2-3'
] as const;

// Default optimization parameters
export const DEFAULT_PARAMS = {
  budget: 50000000, // 50M default budget
  formation: 'auto' as const,
  baseMode: false,
  weights: {
    points: 1.0,
    consistency: 0.1,
    form: 0.2
  }
};
