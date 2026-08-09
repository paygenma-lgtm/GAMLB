/**
 * LandingPage.jsx
 *
 * Публичная главная страница — рендерится по маршруту "/".
 * Пока index.html остаётся статичным файлом, этот компонент
 * просто перенаправляет туда через window.location.
 *
 * Когда главная страница будет перенесена в React —
 * замени содержимое этого файла на полноценный JSX-компонент.
 */

import { useEffect } from 'react';

export default function LandingPage() {
  useEffect(() => {
    // Переход на статичную главную страницу (index.html)
    window.location.replace('/');
  }, []);

  return null;
}
