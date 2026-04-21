export default function AsyncState({
  loading = false,
  error = '',
  isEmpty = false,
  loadingView = null,
  emptyView = null,
  children,
}) {
  if (loading) return loadingView
  if (error) return <div className="auth-server-error" role="alert">{error}</div>
  if (isEmpty) return emptyView
  return children
}
