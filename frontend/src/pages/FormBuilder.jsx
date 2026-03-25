import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm, createField, updateField, deleteField } from '../api/client.js'

const FIELD_TYPES = [
  { value: 'text',     label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number',   label: '数值' },
  { value: 'date',     label: '日期' },
  { value: 'radio',    label: '单选（radio）' },
  { value: 'checkbox', label: '多选（checkbox）' },
  { value: 'select',   label: '下拉选择（select）' },
]

const NEEDS_OPTIONS = ['radio', 'checkbox', 'select']

export default function FormBuilder({ currentUser }) {
  const { projectId, formId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editField, setEditField] = useState(null)

  const isAdmin = currentUser?.role === 'admin'

  async function load() {
    try {
      setLoading(true)
      const data = await getForm(formId)
      setForm(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [formId])

  async function handleDeleteField(fieldId) {
    if (!confirm('确认删除该字段？')) return
    try {
      await deleteField(formId, fieldId)
      load()
    } catch (e) {
      alert('删除失败：' + e.message)
    }
  }

  if (!isAdmin) return <div className="alert alert-error">只有管理员才能访问表单设计器</div>
  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!form) return null

  return (
    <div>
      <div className="breadcrumb">
        <span onClick={() => navigate('/')}>项目列表</span> /
        <span onClick={() => navigate('/projects/' + projectId)}> {projectId.slice(0,8)}…</span> /
        表单设计
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">📋 {form.form_name}</h1>
          <p style={{fontSize:'.85rem', color:'#777', marginTop:'.25rem'}}>{form.description}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditField(null); setShowModal(true) }}>
          + 添加字段
        </button>
      </div>

      <div className="alert alert-info" style={{marginBottom:'1rem'}}>
        拖拽排序功能建议：修改字段的"排列顺序"数值来调整显示顺序
      </div>

      {form.fields.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔧</div>
          <p>表单中还没有字段</p>
          <p style={{marginTop:'.5rem'}}>点击右上角"添加字段"开始设计</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>排序</th>
                <th>字段名称</th>
                <th>字段类型</th>
                <th>必填</th>
                <th>选项</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {form.fields.map(f => (
                <tr key={f.field_id}>
                  <td>{f.display_order}</td>
                  <td><strong>{f.field_label}</strong></td>
                  <td><span className="field-type-badge">{f.field_type}</span></td>
                  <td>{f.required ? <span className="tag tag-orange">必填</span> : <span className="tag">可选</span>}</td>
                  <td style={{fontSize:'.82rem'}}>
                    {f.options?.length > 0 ? f.options.join('，') : '—'}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm"
                      style={{marginRight:'.35rem'}}
                      onClick={() => { setEditField(f); setShowModal(true) }}>编辑</button>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteField(f.field_id)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <FieldModal
          formId={formId}
          initial={editField}
          nextOrder={form.fields.length + 1}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}

function FieldModal({ formId, initial, nextOrder, onClose, onSaved }) {
  const [field, setField] = useState({
    field_label: initial?.field_label || '',
    field_type: initial?.field_type || 'text',
    required: initial?.required ?? false,
    options: initial?.options || [],
    display_order: initial?.display_order ?? nextOrder,
  })
  const [optionsText, setOptionsText] = useState((initial?.options || []).join('\n'))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const needsOptions = NEEDS_OPTIONS.includes(field.field_type)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!field.field_label.trim()) { setErr('字段名称不能为空'); return }
    if (needsOptions) {
      const opts = optionsText.split('\n').map(o => o.trim()).filter(Boolean)
      if (opts.length === 0) { setErr('该字段类型至少需要一个选项'); return }
      field.options = opts
    }
    try {
      setSaving(true)
      if (initial) {
        await updateField(formId, initial.field_id, field)
      } else {
        await createField(formId, field)
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
        <h2 className="modal-title">{initial ? '编辑字段' : '添加字段'}</h2>
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">字段名称 <span className="required">*</span></label>
            <input className="form-input" value={field.field_label}
              onChange={e => setField(f => ({...f, field_label: e.target.value}))}
              placeholder="例：受试者编号" />
          </div>
          <div className="form-group">
            <label className="form-label">字段类型 <span className="required">*</span></label>
            <select className="form-select" value={field.field_type}
              onChange={e => setField(f => ({...f, field_type: e.target.value}))}>
              {FIELD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {needsOptions && (
            <div className="form-group">
              <label className="form-label">选项列表 <span className="required">*</span></label>
              <textarea className="form-textarea" value={optionsText}
                onChange={e => setOptionsText(e.target.value)}
                placeholder={'每行一个选项，例如：\n选项A\n选项B\n选项C'}
                style={{minHeight:'100px'}} />
              <span className="form-hint">每行输入一个选项</span>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">排列顺序</label>
            <input className="form-input" type="number" value={field.display_order}
              onChange={e => setField(f => ({...f, display_order: Number(e.target.value)}))} />
          </div>
          <div className="form-group">
            <label style={{display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer'}}>
              <input type="checkbox" checked={field.required}
                onChange={e => setField(f => ({...f, required: e.target.checked}))} />
              <span className="form-label" style={{margin:0}}>必填字段</span>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '保存中...' : '保存字段'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
