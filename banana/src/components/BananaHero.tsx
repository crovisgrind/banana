// components/BananaHero.tsx
import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
};

export default function BananaHero({ size = 800, className }: Props) {
  return (
    <Image
      src="/images/banana-logo.png"
      alt="Logo Banana"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
