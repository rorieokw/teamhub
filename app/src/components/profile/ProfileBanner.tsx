import { getBannerById, getDefaultBanner } from '../../services/banners';

interface ProfileBannerProps {
  bannerId?: string;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
  rounded?: 'top' | 'all' | 'none';
}

const heightClasses = {
  sm: 'h-16',
  md: 'h-24',
  lg: 'h-32',
};

const roundedClasses = {
  top: 'rounded-t-xl',
  all: 'rounded-xl',
  none: '',
};

export default function ProfileBanner({
  bannerId = 'default',
  height = 'md',
  className = '',
  rounded = 'top',
}: ProfileBannerProps) {
  const banner = getBannerById(bannerId) || getDefaultBanner();

  const animationClass = banner.animation === 'shimmer'
    ? 'banner-shimmer'
    : banner.animation === 'pulse-glow'
    ? 'banner-pulse-glow'
    : '';

  return (
    <div
      className={`w-full ${heightClasses[height]} ${roundedClasses[rounded]} ${animationClass} ${className}`}
      style={{ background: banner.gradient }}
    />
  );
}
