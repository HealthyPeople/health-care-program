import Link from 'next/link'
import SocialIcon from './social-icons'
import siteMetadata from '../../data/siteMetadata'

export const Footer = () => {
  return (
    <footer className="print:hidden">
      <div className="flex flex-col items-center mt-5">
        <div className="flex mb-3 space-x-4">
          <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} size={6} />
          {/* <SocialIcon kind="github" href={siteMetadata.github} size={6} /> */}
          {/* <SocialIcon kind="facebook" href={siteMetadata.facebook} size={6} /> */}
          {/* <SocialIcon kind="youtube" href={siteMetadata.youtube} size={6} /> */}
          {/* <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size={6} /> */}
          {/* <SocialIcon kind="twitter" href={siteMetadata.twitter} size={6} /> */}
        </div>
        <div className="flex flex-col mb-2 space-x-2 text-sm text-gray-500 App:items-center dark:text-gray-400">
          <div className="hidden Tab:flex Tab:flex-row">
            <div>{'주간보호센터 경덕재'}</div>
            <div>&nbsp;{` • `}&nbsp;</div>
            <div>{`© ${new Date().getFullYear()}`}</div>
            <div>&nbsp;{` • `}&nbsp;</div>
            <Link href="/">{`Tel : 000-000-0000 | Fax : 000-000-0000`}</Link>
          </div>

          <div className="flex flex-row Tab:hidden">
            <div>{'주간보호센터 경덕재'}</div>
            {/* <div>{` • `}</div> */}
            <div>{`© ${new Date().getFullYear()}`}</div>
            {/* <div>{` • `}</div> */}
          </div>
          <Link className="Tab:hidden" href="/">{`Tel : 000-000-0000 | Fax : 000-000-0000`}</Link>
        </div>
        <div className="flex flex-col items-center mb-8 text-sm text-gray-500 Tab:flex-row dark:text-gray-400">
          <p>주소 : 경기도 광주시 퇴촌면 천진암로 699</p>
          <p className="hidden Tab:block">&nbsp;|&nbsp;</p>
          <p>E-mail : qwer1234@naver.com</p>
        </div>
      </div>
    </footer>
  )
}
