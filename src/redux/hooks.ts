import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store'; // 👈 your store file

// ✅ typed version of dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>();

// ✅ typed version of selector
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
