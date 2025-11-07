import { HomeComponent } from '../component/main-'

import Image from 'next/image'

export default function Home() {
  return (
    <>
      <div className="relative w-full h-full overflow-hidden">
        <Image src="/img/main/visual0001.png" alt="Description" layout="responsive" width={1000} height={200} />
        <div className="absolute top-0 flex flex-col items-center justify-end w-full h-full p-4 right-3">
          <div className="w-full drop-shadow-lg Tab:pb-16">
            <p className="py-2 pl-2 pr-0 text-sm font-medium text-right text-white Tab:py-7 PC:pr-60 Tab:text-2xl PC:text-4xl">
              전산 시스템
            </p>
            <p className="pb-0 pl-2 pr-0 text-sm font-medium text-right text-white Tab:text-2xl PC:pr-60 PC:text-4xl">
              <span className="text-base font-black Tab:text-4xl PC:text-6xl">지지그린 ASP 업무</span>
            </p>
          </div>
        </div>
      </div>
      <HomeComponent />
    </>
  )
}
