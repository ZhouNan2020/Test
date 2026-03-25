import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm, getEntries, deleteEntry } from '../api/client.js'

export default function EntryList({ currentUser }) {
  const { projectId, formId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isAdmin = currentUser?.role === 'admin'

  async function load() {
    try {
      setLoading(true)
      const [f, e] = await Promise.all([getForm(formId), getEntries(formId)])
      setForm(f)
      setEntries(e)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [formId])

  async function handleDelete(entryId) {
    if (!confirm('确认删除该条记录？')) return
    try {
      await deleteEntry(entryId)
      load()
    } catch (e) {
      alert('删除失败：' + e.message)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>

  return (
    <div>
      <div className="breadcrumb">
        <span onClick={() => navigate('/')}>项目列表</span> /
        <span onClick={() => navigate('/projects/' + projectId)}> 项目详情</span> /
        {form?.form_name} · 录入记录
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">📊 {form?.form_name} - 数据记录</h1>
          <p style={{fontSize:'.85rem', color:'#777', marginTop:'.25rem'}}>
            共 {entries.length} 条记录
          </p>
        </div>
        <button className="btn btn-primary"
          onClick={() => navigate(`/projects/${projectId}/forms/${formId}/entry`)}>
          + 录入新数据
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>暂无数据记录</p>
          <button className="btn btn-primary" style={{marginTop:'1rem'}}
            onClick={() => navigate(`/projects/${projectId}/forms/${formId}/entry`)}>
            立即录入
          </button>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>录入人</th>
                <th>录入时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.entry_id}>
                  <td>{i + 1}</td>
                  <td>{e.submitted_by}</td>
                  <td>{e.submitted_at?.slice(0,16).replace('T',' ')}</td>
                  <td>
                    <span className={`tag ${e.status === 'submitted' ? 'tag-green' : 'tag-orange'}`}>
                      {e.status === 'submitted' ? '已提交' : '草稿'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm"
                      style={{marginRight:'.35rem'}}
                      onClick={() => navigate('/entries/' + e.entry_id)}>
                      查看
                    </button>
                    {isAdmin && (
                      <button className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(e.entry_id)}>
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
