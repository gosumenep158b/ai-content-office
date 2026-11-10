import { withAuth } from "@/middleware/auth";

export default withAuth(function middleware(req) {
  // This is the middleware wrapper - actual logic in withAuth
}, {
  paths: {
    protected: ["/dashboard", "/tasks", "/tasks/*"],
    public: ["/", "/login", "/api/auth"],
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/login",
    "/api/auth/:path*",
  ],
};