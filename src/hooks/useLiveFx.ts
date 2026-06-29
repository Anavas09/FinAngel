import { useEffect } from 'react';

import type { Tweaks } from '../types';

export const useLiveFx = (setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void) => {
  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(r => {
        if (!r.ok) throw new Error(`DolarApi ${r.status}`);
        return r.json();
      })
      .then((data: { venta?: number }) => {
        if (data.venta != null) {
          setTweak('fxUSD', data.venta);
          setTweak('fxUSDT', data.venta);
        }
      })
      .catch(() => {
        // silently fall back to saved/default value
      });
  }, []);
};
