import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <h2 className="text-2xl font-bold mb-2">Página não encontrada</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-4">A página que você procura não existe ou foi movida.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
