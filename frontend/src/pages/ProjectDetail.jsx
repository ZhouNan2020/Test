import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, getForms, createForm, updateForm, deleteForm } from '../api/client.js'

export default function ProjectDetail({ currentUser }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const isAdmin = currentUser?.role === 'admin'

  async function load() {
    try {
      setLoading(true)
      const [p, f] = await Promise.all([getProject(projectId), getForms(projectId)])
      setProject(p)
      setForms(f)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  async function handleDeleteForm(formId) {
    if (!confirm('确认删除该表单及其所有数据？')) return
    try {
      await deleteForm(formId)
      load()
    } catch (e) {
      alert('删除失败：' + e.message)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!project) return null

  return (
    <div>
      <div className="breadcrumb">
        <span onClick={() => navigate('/')}>项目列表</span> / {project.project_name}
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{project.project_name}</h1>
          <div style={{marginTop:'.25rem'}}>
            <span className="tag tag-blue">{project.project_code}</span>
            <span style={{marginLeft:'.75rem', fontSize:'.82rem', color:'#777'}}>
              创建人：{project.created_by} · {project.created_at?.slice(0,10)}
            </span>
          </div>
          {project.description && (
            <p style={{marginTop:'.5rem', fontSize:'.88rem', color:'#555'}}>{project.description}</p>
          )}
        </div>
        {isAdmin && (
          <button className="btn btn-primary"
            onClick={() => { setEditTarget(null); setShowModal(true) }}>
            + 新建表单
          </button>
        )}
      </div>

      <div className="section-header">
        <span className="section-title">数据录入表单</span>
        <span style={{fontSize:'.8rem', color:'#777'}}>共 {forms.length} 套表单</span>
      </div>

      {forms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <p>暂无表单</p>
          {isAdmin && <p style={{marginTop:'.5rem'}}>点击右上角"新建表单"创建</p>}
        </div>
      ) : (
        forms.map(f => (
          <div key={f.form_id} className="card">
            <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
              <div>
                <div className="card-title">{f.form_name}</div>
                <div className="card-meta">
                  创建人：{f.created_by} · {f.created_at?.slice(0,10)}
                </div>
                {f.description && <p style={{marginTop:'.25rem', fontSize:'.85rem', color:'#555'}}>{f.description}</p>}
              </div>
              <div className="card-actions">
                {isAdmin && (
                  <>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/projects/${projectId}/forms/${f.form_id}/builder`)}>
                      表单设计
                    </button>
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => { setEditTarget(f); setShowModal(true) }}>
                      编辑
                    </button>
                  </>
                )}
                <button className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/projects/${projectId}/forms/${f.form_id}/entry`)}>
                  录入数据
                </button>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/projects/${projectId}/forms/${f.form_id}/entries`)}>
                  查看记录
                </button>
                {isAdmin && (
                  <button className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteForm(f.form_id)}>
                    删除
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <FormModal
          projectId={projectId}
          initial={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}

function FormModal({ projectId, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    form_name: initial?.form_name || '',
    description: initial?.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.form_name.trim()) { setErr('表单名称不能为空'); return }
    try {
      setSaving(true)
      if (initial) {
        await updateForm(initial.form_id, form)
      } else {
        await createForm(projectId, form)
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
        <h2 className="modal-title">{initial ? '编辑表单' : '新建数据录入表单'}</h2>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">表单名称 <span className="required">*</span></label>
            <input className="form-input" value={form.form_name}
              onChange={e => setForm(f => ({...f, form_name: e.target.value}))}
              placeholder="例：基线访视数据采集表" />
          </div>
          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea className="form-textarea" value={form.description}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="表单用途说明..." />
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
