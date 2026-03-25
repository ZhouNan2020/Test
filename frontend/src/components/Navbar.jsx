export default function Navbar({ currentUser, users, onUserSwitch }) {
  return (
    <nav className="navbar">
      <span className="navbar-brand">🏥 临床研究数据管理系统 (EDC)</span>
      <div className="navbar-right">
        <span>当前用户：<strong>{currentUser?.username}</strong></span>
        <span className={`role-badge ${currentUser?.role}`}>
          {currentUser?.role === 'admin' ? '超级管理员' : '研究者/CRC'}
        </span>
        {users.length > 0 && (
          <select
            value={currentUser?.user_id || ''}
            onChange={e => onUserSwitch(e.target.value)}
            title="切换用户身份（演示用）"
          >
            {users.map(u => (
              <option key={u.user_id} value={u.user_id}>
                {u.username} ({u.role === 'admin' ? '管理员' : '用户'})
              </option>
            ))}
          </select>
        )}
      </div>
    </nav>
  )
}
