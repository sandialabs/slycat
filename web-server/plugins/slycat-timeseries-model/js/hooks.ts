import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

// Creating pre-typed versions of the useDispatch and useSelector hooks for usage in the app.
// https://react-redux.js.org/using-react-redux/usage-with-typescript#define-typed-hooks
// Use throughout the app instead of plain `useDispatch` and `useSelector`
type DispatchFunc = () => AppDispatch;

export const useAppDispatch: DispatchFunc = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
