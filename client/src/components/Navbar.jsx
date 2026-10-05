import { NavLink } from 'react-router-dom';

const linkBase = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all';

export default function Navbar() {
  return (
    <nav className="w-full flex justify-center pt-8 pb-4 animate-fade-up">
      <div className="nm-flat flex items-center gap-2 px-4 py-3 flex-wrap justify-center">
        <NavLink to="/" end className={({isActive}) =>
          `${linkBase} ${isActive ? 'nm-pressed text-brand' : 'hover:text-brand'}`}>🏠 Home</NavLink>
        <NavLink to="/upload" className={({isActive}) =>
          `${linkBase} ${isActive ? 'nm-pressed text-brand' : 'hover:text-brand'}`}>☁️ Upload</NavLink>
        <NavLink to="/drive" className={({isActive}) =>
          `${linkBase} ${isActive ? 'nm-pressed text-brand' : 'hover:text-brand'}`}>📁 Files</NavLink>
        <NavLink to="/revoke" className={({isActive}) =>
          `${linkBase} ${isActive ? 'nm-pressed text-brand' : 'hover:text-brand'}`}>🗑️ Revoke</NavLink>
        <NavLink to="/settings" className={({isActive}) =>
          `${linkBase} ${isActive ? 'nm-pressed text-brand' : 'hover:text-brand'}`}>⚙️</NavLink>
      </div>
    </nav>
  );
}
