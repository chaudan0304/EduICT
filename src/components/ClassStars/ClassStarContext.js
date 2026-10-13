import { createContext } from 'react';

// The API commits the batch; consumers only merge its authoritative result.
export const ClassStarContext = createContext(null);
