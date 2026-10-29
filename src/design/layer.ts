import { createContext } from 'react';

/** The lantern-masked layer inside the shell. Things portaled here are only visible near the lantern. */
export const LanternLayer = createContext<HTMLElement | null>(null);
