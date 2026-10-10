import { Link } from "react-router-dom";

function WorkspaceHeader({ subtitle }) {
  return (
    <div className="w-full border-b border-white/10 bg-[#060e1b] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-xl font-semibold tracking-wide text-white"
          >
            BizLift
          </Link>

          <div className="hidden md:block text-sm text-white/50">
            {subtitle}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm text-white/60 transition hover:text-white"
          >
            Home
          </Link>

          <Link
            to="/portal"
            className="text-sm text-white/60 transition hover:text-white"
          >
            Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceHeader;
