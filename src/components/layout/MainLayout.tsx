import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function MainLayout() {
  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans text-gray-800 overflow-hidden">
      <Header />
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}