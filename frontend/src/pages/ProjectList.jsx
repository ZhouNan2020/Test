import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject, updateProject, deleteProject } from '../api/client.js'

export default function ProjectList({ currentUser }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const navigate = useNavigate()

  const isAdmin = currentUser?.role === 'admin'

  async function load() {
    try {
      setLoading(true)
      const data = await getProjects()
      setProjects(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    if (!confirm('确认删除该项目及其所有数据？')) return
    try {
      await deleteProject(id)
      load()
    } catch (e) {
      alert('删除失败：' + e.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">临床研究项目列表</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditTarget(null); setShowModal(true) }}>
            + 新建项目
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>暂无研究项目</p>
          {isAdmin && <p style={{marginTop:'.5rem'}}>点击右上角"新建项目"开始</p>}
        </div>
      ) : (
        <div>
          {projects.map(p => (
            <div key={p.project_id} className="card" style={{cursor:'pointer'}}
              onClick={() => navigate('/projects/' + p.project_id)}>
              <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
                <div>
                  <div className="card-title">{p.project_name}</div>
                  <div className="card-meta">
                    <span className="tag tag-blue" style={{marginRight:'.5rem'}}>{p.project_code}</span>
                    创建人：{p.created_by} · 创建时间：{p.created_at?.slice(0,10)}
                  </div>
                  {p.description && <p style={{marginTop:'.5rem', fontSize:'.88rem', color:'#555'}}>{p.description}</p>}
                </div>
                {isAdmin && (
                  <div className="card-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditTarget(p); setShowModal(true) }}>编辑</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.project_id)}>删除</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProjectModal
          initial={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}

function ProjectModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    project_name: initial?.project_name || '',
    project_code: initial?.project_code || '',
    description: initial?.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.project_name.trim()) { setErr('项目名称不能为空'); return }
    if (!form.project_code.trim()) { setErr('项目编号不能为空'); return }
    try {
      setSaving(true)
      if (initial) {
        await updateProject(initial.project_id, form)
      } else {
        await createProject(form)
      }
      onSaved()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{initial ? '编辑研究项目' : '新建研究项目'}</h2>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">项目名称 <span className="required">*</span></label>
            <input className="form-input" value={form.project_name}
              onChange={e => setForm(f => ({...f, project_name: e.target.value}))}
              placeholder="例：2型糖尿病真实世界研究" />
          </div>
          <div className="form-group">
            <label className="form-label">项目编号 <span className="required">*</span></label>
            <input className="form-input" value={form.project_code}
              onChange={e => setForm(f => ({...f, project_code: e.target.value.toUpperCase()}))}
              placeholder="例：DM2024" />
            <span className="form-hint">仅限大写字母和数字，全局唯一</span>
          </div>
          <div className="form-group">
            <label className="form-label">项目描述</label>
            <textarea className="form-textarea" value={form.description}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="简要描述研究目的、方法等..." />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
