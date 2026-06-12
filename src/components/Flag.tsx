import styles from './Flag.module.css'

type Props = {
  className?: string
  title?: string
}

export function Flag({ className, title = 'U.S. flag' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 13 13"
      className={className ? `${styles.flag} ${className}` : styles.flag}
      role="img"
      aria-label={title}
    >
      <rect width="13" height="13" fill="#c8102e" />
      <g fill="#ffffff">
        <rect y="1.857" width="13" height="1.857" />
        <rect y="5.571" width="13" height="1.857" />
        <rect y="9.286" width="13" height="1.857" />
      </g>
      <rect width="5" height="5.571" fill="#0c1b33" />
      <polygon
        fill="#ffffff"
        points="2.5,1.086 2.882,2.26 4.117,2.261 3.118,2.987 3.5,4.161 2.5,3.436 1.5,4.161 1.882,2.987 0.883,2.261 2.118,2.26"
      />
    </svg>
  )
}
