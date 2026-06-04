import Link from 'next/link'
import type { Member } from '@/payload-types'
import { formatDistrict } from '@/lib/format'
import { MemberPhoto } from './MemberPhoto'
import { PartyName } from './PartyName'
import styles from './MemberCard.module.css'

type Props = {
  member: Member
}

export function MemberCard({ member }: Props) {
  return (
    <Link href={`/members/${member.slug}`} className={`card ${styles.memberCard}`}>
      <MemberPhoto src={member.imageUrl} />
      <div className={styles.name}>
        <PartyName party={member.party} name={member.fullName} />
      </div>
      <div className={styles.place}>{formatDistrict(member)}</div>
    </Link>
  )
}
