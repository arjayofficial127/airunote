'use client';
import { createContext, useContext } from 'react';
import { bookApi } from './services';
import { airunoteApi } from '@/components/airunote/services/airunoteApi';
export const BookServicesContext = createContext({ ...bookApi, createFolder: airunoteApi.createFolder });
export function useBookServices() { return useContext(BookServicesContext); }
