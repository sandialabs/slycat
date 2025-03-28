import { configureStore } from '@reduxjs/toolkit'
import cCAWizardReducer from './reducers/cCAWizardSlice'
const globalWindow = (window as any);
export const cCAWizardStore = configureStore({
  reducer: {
    cCAWizard: cCAWizardReducer
  },
})


// Get the type of our store variable
export type AppStore = typeof cCAWizardStore
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = AppStore['dispatch']

globalWindow.cCAWizardStore = cCAWizardStore;