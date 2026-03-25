import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm, submitEntry } from '../api/client.js'

export default function DataEntry({ currentUser }) {
  const { projectId, formId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [values, setValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [serverErrors, setServerErrors] = useState([])

  useEffect(() => {
    getForm(formId)
      .then(data => { setForm(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [formId])

  function setValue(fieldId, value) {
    setValues(v => ({ ...v, [fieldId]: value }))
    setValidationErrors(e => { const n = { ...e }; delete n[fieldId]; return n })
  }

  function toggleCheckbox(fieldId, option) {
    setValues(prev => {
      const current = Array.isArray(prev[fieldId]) ? prev[fieldId] : []
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option]
      return { ...prev, [fieldId]: next }
    })
  }

  function validateClient() {
    const errs = {}
    for (const f of (form?.fields || [])) {
      const v = values[f.field_id]
      const empty = v === undefined || v === null || v === '' ||
        (Array.isArray(v) && v.length === 0)
      if (f.required && empty) {
        errs[f.field_id] = '该字段为必填项'
      }
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerErrors([])
    const errs = validateClient()
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return }
    try {
      setSubmitting(true)
      await submitEntry(formId, { values, status: 'submitted' })
      setSubmitted(true)
    } catch (e) {
      if (e.message === 'Validation failed') {
        // handled via server errors in response
      }
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!form) return null

  if (submitted) {
    return (
      <div style={{textAlign:'center', padding:'3rem'}}>
        <div style={{fontSize:'3rem', marginBottom:'1rem'}}>✅</div>
        <h2 style={{color:'#276749', marginBottom:'1rem'}}>数据录入成功！</h2>
        <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
          <button className="btn btn-secondary"
            onClick={() => { setSubmitted(false); setValues({}) }}>
            继续录入
          </button>
          <button className="btn btn-primary"
            onClick={() => navigate(`/projects/${projectId}/forms/${formId}/entries`)}>
            查看已录入记录
          </button>
          <button className="btn btn-secondary"
            onClick={() => navigate('/projects/' + projectId)}>
            返回项目
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="breadcrumb">
        <span onClick={() => navigate('/')}>项目列表</span> /
        <span onClick={() => navigate('/projects/' + projectId)}> 项目详情</span> /
        数据录入
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">📝 {form.form_name}</h1>
          {form.description && <p style={{color:'#777', fontSize:'.85rem', marginTop:'.25rem'}}>{form.description}</p>}
        </div>
        <button className="btn btn-secondary"
          onClick={() => navigate(`/projects/${projectId}/forms/${formId}/entries`)}>
          查看历史记录
        </button>
      </div>

      {form.fields.length === 0 ? (
        <div className="alert alert-info">该表单尚未定义任何字段，请联系管理员完善表单设计。</div>
      ) : (
        <div className="card" style={{maxWidth:'680px'}}>
          <form onSubmit={handleSubmit}>
            {form.fields.map(field => (
              <FieldInput
                key={field.field_id}
                field={field}
                value={values[field.field_id]}
                onChange={(v) => setValue(field.field_id, v)}
                onCheckboxToggle={(opt) => toggleCheckbox(field.field_id, opt)}
                error={validationErrors[field.field_id]}
              />
            ))}
            <div style={{marginTop:'1.5rem', display:'flex', gap:'.75rem'}}>
              <button type="submit" className="btn btn-success" disabled={submitting}>
                {submitting ? '提交中...' : '✓ 提交数据'}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => { setValues({}); setValidationErrors({}) }}>
                重置
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function FieldInput({ field, value, onChange, onCheckboxToggle, error }) {
  const { field_label, field_type, required, options } = field

  return (
    <div className="form-group">
      <label className="form-label">
        {field_label}
        {required && <span className="required"> *</span>}
        <span className="field-type-badge" style={{marginLeft:'.5rem'}}>{field_type}</span>
      </label>

      {field_type === 'text' && (
        <input className="form-input" type="text" value={value || ''}
          onChange={e => onChange(e.target.value)} />
      )}
      {field_type === 'textarea' && (
        <textarea className="form-textarea" value={value || ''}
          onChange={e => onChange(e.target.value)} />
      )}
      {field_type === 'number' && (
        <input className="form-input" type="number" step="any" value={value || ''}
          onChange={e => onChange(e.target.value)} />
      )}
      {field_type === 'date' && (
        <input className="form-input" type="date" value={value || ''}
          onChange={e => onChange(e.target.value)} />
      )}
      {field_type === 'select' && (
        <select className="form-select" value={value || ''}
          onChange={e => onChange(e.target.value)}>
          <option value="">— 请选择 —</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
      {field_type === 'radio' && (
        <div className="radio-group">
          {options.map(opt => (
            <label key={opt}>
              <input type="radio" name={field.field_id} value={opt}
                checked={value === opt} onChange={() => onChange(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}
      {field_type === 'checkbox' && (
        <div className="checkbox-group">
          {options.map(opt => (
            <label key={opt}>
              <input type="checkbox"
                checked={Array.isArray(value) && value.includes(opt)}
                onChange={() => onCheckboxToggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}
    </div>
  )
}
