import { ReactNodeProps } from '../types'

export const MainContainer = ({ children }: ReactNodeProps) => {
  return <main className="flex flex-col items-center justify-between min-h-screen">{children}</main>
}
