import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToIdWhenMounted } from '../lib/scrollToIdWhenMounted';

/**
 * Rola suavemente até a seção indicada em location.hash. As seções são lazy e podem ainda não estar montadas quando a
 * rota troca, então o scroll espera por elas e depois mantém a seção alinhada enquanto o conteúdo acima se acomoda
 * (veja scrollToIdWhenMounted). Depois do scroll o foco vai para o título da seção, para o próximo Tab seguir dali.
 */
export function useScrollToHash() {
  // `key` changes on every navigation, so following the same hash link a second time scrolls again.
  const { hash, key, pathname } = useLocation();
  // The page this hook belongs to. A page that is fading out still sees the new location: it must not chase the hash
  // of the page that arrives (it would focus its own section of the same id before the new page mounts).
  const [ownPathname] = useState(pathname);

  useEffect(() => {
    if (!hash || pathname !== ownPathname) return;
    return scrollToIdWhenMounted(hash.slice(1), { focus: 'heading' });
  }, [hash, key, pathname, ownPathname]);
}
