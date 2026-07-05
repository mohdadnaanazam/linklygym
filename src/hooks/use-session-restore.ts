import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { workoutsRepo } from '@/db/repositories';

export function useSessionRestore() {
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    try {
      const active = workoutsRepo.getActive();
      if (active) {
        router.replace('/workout/active');
      }
    } catch {
    }
  }, [router]);
}
