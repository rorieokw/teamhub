import { GameCard } from '../cards/PlayingCard';
import type { Card } from '../../types/poker';

interface PokerCardProps {
  card?: Card;
  faceDown?: boolean;
  small?: boolean;
  className?: string;
  animate?: boolean;
  dealDelay?: number;
}

export default function PokerCard({
  card,
  faceDown = false,
  small = false,
  className = '',
  animate = false,
  dealDelay = 0,
}: PokerCardProps) {
  return (
    <GameCard
      card={card}
      size={small ? 'sm' : 'md'}
      faceDown={faceDown || !card}
      className={className}
      animate={animate}
      dealDelay={dealDelay}
    />
  );
}
