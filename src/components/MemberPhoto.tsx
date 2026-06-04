import styles from './MemberPhoto.module.css'

type Size = 'sm' | 'md' | 'lg'

type Props = {
  src?: string | null
  alt?: string
  size?: Size
}

export function MemberPhoto({ src, alt = '', size = 'md' }: Props) {
  const className = `${styles.photo} ${styles[size]}`
  return src ? (
    <img src={src} alt={alt} className={className} />
  ) : (
    <div className={className} />
  )
}
