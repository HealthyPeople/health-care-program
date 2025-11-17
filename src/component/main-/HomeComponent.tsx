import React from 'react';

export const HomeComponent = () => {
  return (
    <>
      <div className="flex flex-col">
        <div className="flex flex-col items-center w-full p-2 overflow-hidden Tab:flex-row">
          {/* 요양원 */}
          <div className="h-52 Tab:h-56 mb-3 Tab:mb-0 w-full min-w-[200px] max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow Tab:w-4/12 dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
              <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">요양원</h5>
            </a>
            <div className="h-20 Tab:h-24">
              <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">요양원 회원 관리 프로그램</p>
              <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">전산시스템 바로가기</p>
            </div>
            <a
              href="/login?type=nursingHome"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              이동
              <svg
                className="w-3.5 h-3.5 ml-2"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 5h12m0 0L9 1m4 4L9 9"
                />
              </svg>
            </a>
          </div>
          {/* 주야간보호 */}
          <div className="h-52 Tab:mx-3 Tab:h-56 mb-3 Tab:mb-0 w-full min-w-[200px] Tab:w-4/12 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
              <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">주야간보호</h5>
            </a>
            <div className="h-20 Tab:h-24">
              <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">주야간보호 회원 관리 프로그램</p>
              <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">전산시스템 바로가기</p>
            </div>
            <a
              href="/login?type=dayNightCare"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              이동
              <svg
                className="w-3.5 h-3.5 ml-2"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 5h12m0 0L9 1m4 4L9 9"
                />
              </svg>
            </a>
          </div>
          {/* 단기보호 */}
          <div className=" h-52 Tab:h-56 mb-3 Tab:mb-0 w-full min-w-[200px] Tab:w-4/12 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
              <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">단기보호</h5>
            </a>
            <div className="h-20 Tab:h-24">
              <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">단기보호 회원 관리 프로그램</p>
              <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">전산시스템 바로가기</p>
            </div>
            <a
              href="/login?type=shortTermCare"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              이동
              <svg
                className="w-3.5 h-3.5 ml-2"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 5h12m0 0L9 1m4 4L9 9"
                />
              </svg>
            </a>
          </div>
        </div>
        {/* </div> */}
      </div>
    </>
  )
}
