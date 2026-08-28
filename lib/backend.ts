/**
 * Next.js 서버에서 FastAPI로 요청을 전달할 때 사용하는 내부 주소입니다.
 * 브라우저에는 상대 경로(`/api/backend`)만 노출해 배포 환경에서도 localhost를
 * 잘못 참조하지 않도록 합니다.
 */
export const BACKEND_API_URL =
  process.env.BACKEND_API_URL || "http://localhost:8000/api/v1";
