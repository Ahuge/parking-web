type ImageLoaderParams = {
  src: string
  width: number
  quality?: number
}

export default function imageLoader({ src, width, quality }: ImageLoaderParams) {
  return `${src}?w=${width}&q=${quality || 75}`
}
