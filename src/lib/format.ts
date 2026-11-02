export const fmtDate = (value: string) => new Date(value.slice(0,10) + 'T00:00:00').toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
export const dateISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const friendlyError = (err: unknown) => err instanceof Error ? err.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
