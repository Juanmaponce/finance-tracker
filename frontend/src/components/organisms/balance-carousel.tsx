import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BalanceCard } from '@/components/molecules/balance-card';
import { SavingsGoalCarouselCard } from '@/components/molecules/savings-goal-carousel-card';
import { AddAccountModal } from '@/components/organisms/add-account-modal';
import { useAccountBalances } from '@/hooks/use-accounts';
import { useSavings } from '@/hooks/use-savings';
import { cn } from '@/lib/utils';

export function BalanceCarousel() {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: balances, isLoading: loadingBalances } = useAccountBalances();
  const { data: savingsGoals, isLoading: loadingSavings } = useSavings();

  const activeSavings = savingsGoals?.filter((g) => g.progress < 100) ?? [];
  const totalCards = (balances?.length ?? 0) + activeSavings.length + 1;

  // Check scroll boundaries and active card
  function syncScrollState() {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);

    // Find which card is closest to the left edge
    const children = Array.from(el.children) as HTMLElement[];
    let closest = 0;
    let closestDist = Infinity;

    for (let i = 0; i < children.length; i++) {
      const dist = Math.abs(children[i].offsetLeft - scrollLeft - 16); // 16px = px-4
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    setActiveIndex(closest);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    syncScrollState();

    el.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', syncScrollState);
    return () => {
      el.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
    };
  }, [balances, savingsGoals]);

  function scrollToCard(index: number) {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft - 16, behavior: 'smooth' });
  }

  if (loadingBalances || loadingSavings) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="min-w-[75%] h-48 rounded-xl flex-shrink-0" />
          <Skeleton className="min-w-[75%] h-48 rounded-xl flex-shrink-0" />
        </div>
      </div>
    );
  }

  const hasCards = (balances?.length ?? 0) > 0 || activeSavings.length > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Balances</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddAccount(true)}
          className="gap-1.5 h-7 text-xs rounded-lg"
        >
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </div>

      {/* Carousel */}
      {hasCards ? (
        <div className="group relative">
          {/* Left arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scrollToCard(Math.max(0, activeIndex - 1))}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 size-8 rounded-full bg-card border border-border shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4 text-foreground" />
            </button>
          )}

          {/* Right arrow */}
          {canScrollRight && (
            <button
              onClick={() => scrollToCard(Math.min(totalCards - 1, activeIndex + 1))}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 size-8 rounded-full bg-card border border-border shadow-md items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
              aria-label="Siguiente"
            >
              <ChevronRight className="size-4 text-foreground" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Account balance cards */}
            {balances?.map((balance) => (
              <div
                key={balance.accountId}
                className="min-w-[75%] sm:min-w-[60%] md:min-w-[45%] flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              >
                <BalanceCard balance={balance} />
              </div>
            ))}

            {/* Savings goal cards */}
            {activeSavings.map((goal) => (
              <div
                key={goal.id}
                className="min-w-[75%] sm:min-w-[60%] md:min-w-[45%] flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              >
                <SavingsGoalCarouselCard goal={goal} />
              </div>
            ))}

            {/* Add account placeholder */}
            <div
              className="min-w-[75%] sm:min-w-[60%] md:min-w-[45%] flex-shrink-0"
              style={{ scrollSnapAlign: 'start' }}
            >
              <button
                onClick={() => setShowAddAccount(true)}
                className="h-full min-h-[180px] w-full rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary-500 transition-colors"
              >
                <Plus className="size-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Agregar cuenta</p>
              </button>
            </div>
          </div>

          {/* Dot indicators */}
          {totalCards > 1 && (
            <div className="flex justify-center gap-1.5 pt-1">
              {Array.from({ length: totalCards }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToCard(i)}
                  className={cn(
                    'rounded-full transition-all',
                    i === activeIndex
                      ? 'w-5 h-1.5 bg-primary-500'
                      : 'size-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                  )}
                  aria-label={`Ir a tarjeta ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowAddAccount(true)}
          className="w-full min-h-[180px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary-500 transition-colors"
        >
          <Plus className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Crea tu primera cuenta</p>
        </button>
      )}

      {/* Add account modal */}
      <AddAccountModal open={showAddAccount} onOpenChange={setShowAddAccount} />
    </div>
  );
}
