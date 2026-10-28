import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToIdWhenMounted } from './scrollToIdWhenMounted';

/**
 * Rola suavemente até a seção indicada em location.hash. As seções são lazy e podem ainda não estar montadas quando a
 * rota troca, então o scroll espera por elas e depois mantém a seção alinhada enquanto o conteúdo acima se acomoda
 * (veja scrollToIdWhenMounted).
 */
export function useScrollToHash() {
  // `key` changes on every navigation, so following the same hash link a second time scrolls again.
  const { hash, key } = useLocation();

  useEffect(() => {
    if (!hash) return;
    return scrollToIdWhenMounted(hash.slice(1));
  }, [hash, key]);
}
