import styles from './PartyName.module.css'

type Props = {
  party?: string | null
  name: string
}

export function PartyName({ party, name }: Props) {
  const partyKey = (party ? party.toLowerCase() : 'independent') as
    | 'democrat'
    | 'republican'
    | 'independent'
  return (
    <>
      <span className={`${styles.partyDot} ${styles[partyKey]}`} aria-hidden /> {name}
    </>
  )
}
