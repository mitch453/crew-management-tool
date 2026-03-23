import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, X, UserPlus, Palmtree, Thermometer } from 'lucide-react'
import './App.css'

const INITIAL_INSTALLERS = [
  { id: 'stank', name: 'Stank', level: 5 },
  { id: 'jayden', name: 'Jayden', level: 5 },
  { id: 'zach', name: 'Zach', level: 4.5 },
  { id: 'felix', name: 'Felix', level: 4.5 },
  { id: 'marcus', name: 'Marcus', level: 4 },
  { id: 'trae', name: 'Trae', level: 4 },
  { id: 'oscar', name: 'Oscar', level: 3.5 },
  { id: 'andy', name: 'Andy', level: 3.5 },
  { id: 'kieran', name: 'Kieran', level: 3 },
  { id: 'william', name: 'William', level: 3 },
  { id: 'josh', name: 'Josh', level: 2.5 },
  { id: 'jackson', name: 'Jackson', level: 2 },
  { id: 'devon', name: 'Devon', level: 1.5 },
  { id: 'lachie', name: 'Lachie', level: 1.5 },
  { id: 'luke', name: 'Luke', level: 1.5 },
]

function getLevelColor(level) {
  if (level >= 4.5) return '#22c55e'
  if (level >= 3.5) return '#eab308'
  if (level >= 2.5) return '#f97316'
  return '#ef4444'
}

function getLevelLabel(level) {
  if (level >= 4.5) return 'Expert'
  if (level >= 3.5) return 'Advanced'
  if (level >= 2.5) return 'Intermediate'
  return 'Junior'
}

function loadState() {
  try {
    const saved = localStorage.getItem('crew-manager-state')
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveState(state) {
  localStorage.setItem('crew-manager-state', JSON.stringify(state))
}

function InstallerCard({ installer, provided, isDragging, onToggleLeave }) {
  const isUnavailable = installer.leaveType != null

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`installer-card ${isDragging ? 'dragging' : ''} ${isUnavailable ? 'unavailable' : ''}`}
    >
      <div className="installer-info">
        <span className="installer-name">{installer.name}</span>
        <span className="installer-level" style={{ backgroundColor: getLevelColor(installer.level) }}>
          {installer.level} - {getLevelLabel(installer.level)}
        </span>
      </div>
      {isUnavailable && (
        <div className={`leave-badge ${installer.leaveType}`}>
          {installer.leaveType === 'annual' ? <Palmtree size={12} /> : <Thermometer size={12} />}
          {installer.leaveType === 'annual' ? 'Annual Leave' : 'Sick Leave'}
        </div>
      )}
      <div className="installer-actions">
        {!isUnavailable ? (
          <>
            <button
              className="leave-btn annual"
              onClick={(e) => { e.stopPropagation(); onToggleLeave(installer.id, 'annual') }}
              title="Mark as Annual Leave"
            >
              <Palmtree size={14} />
            </button>
            <button
              className="leave-btn sick"
              onClick={(e) => { e.stopPropagation(); onToggleLeave(installer.id, 'sick') }}
              title="Mark as Sick Leave"
            >
              <Thermometer size={14} />
            </button>
          </>
        ) : (
          <button
            className="leave-btn available"
            onClick={(e) => { e.stopPropagation(); onToggleLeave(installer.id, null) }}
            title="Mark as Available"
          >
            <UserPlus size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const saved = loadState()

  const [installers, setInstallers] = useState(saved?.installers || INITIAL_INSTALLERS)
  const [crews, setCrews] = useState(saved?.crews || [])
  const [crewCounter, setCrewCounter] = useState(saved?.crewCounter || 1)

  useEffect(() => {
    saveState({ installers, crews, crewCounter })
  }, [installers, crews, crewCounter])

  const availableInstallers = installers.filter(
    (i) => !crews.some((c) => c.members.some((m) => m.id === i.id))
  )

  function addCrew() {
    setCrews([...crews, { id: `crew-${crewCounter}`, name: `Crew ${crewCounter}`, members: [] }])
    setCrewCounter(crewCounter + 1)
  }

  function removeCrew(crewId) {
    setCrews(crews.filter((c) => c.id !== crewId))
  }

  function renameCrew(crewId, name) {
    setCrews(crews.map((c) => (c.id === crewId ? { ...c, name } : c)))
  }

  function toggleLeave(installerId, leaveType) {
    setInstallers(
      installers.map((i) => (i.id === installerId ? { ...i, leaveType } : i))
    )
    if (leaveType != null) {
      setCrews(
        crews.map((c) => ({
          ...c,
          members: c.members.map((m) => (m.id === installerId ? { ...m, leaveType } : m)),
        }))
      )
    } else {
      setCrews(
        crews.map((c) => ({
          ...c,
          members: c.members.map((m) => (m.id === installerId ? { ...m, leaveType: undefined } : m)),
        }))
      )
    }
  }

  function onDragEnd(result) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const installer = installers.find((i) => i.id === draggableId)
    if (!installer) return

    if (installer.leaveType != null && destination.droppableId !== 'pool') return

    let newCrews = crews.map((c) => ({
      ...c,
      members: c.members.filter((m) => m.id !== draggableId),
    }))

    if (destination.droppableId !== 'pool') {
      newCrews = newCrews.map((c) => {
        if (c.id === destination.droppableId) {
          const newMembers = [...c.members]
          newMembers.splice(destination.index, 0, installer)
          return { ...c, members: newMembers }
        }
        return c
      })
    }

    setCrews(newCrews)
  }

  function getCrewAverage(crew) {
    const available = crew.members.filter((m) => m.leaveType == null)
    if (available.length === 0) return 0
    return (available.reduce((sum, m) => sum + m.level, 0) / available.length).toFixed(1)
  }

  function getCrewTotal(crew) {
    return crew.members.filter((m) => m.leaveType == null).reduce((sum, m) => sum + m.level, 0)
  }

  function resetAll() {
    setInstallers(INITIAL_INSTALLERS)
    setCrews([])
    setCrewCounter(1)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Crew Management</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={addCrew}>
            <Plus size={16} /> New Crew
          </button>
          <button className="btn btn-ghost" onClick={resetAll}>
            Reset All
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="main-layout">
          <div className="pool-section">
            <h2>Available Installers <span className="count">({availableInstallers.filter(i => !i.leaveType).length})</span></h2>
            <Droppable droppableId="pool">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`pool-list ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                >
                  {availableInstallers.filter(i => !i.leaveType).length === 0 && !availableInstallers.some(i => i.leaveType) && (
                    <p className="empty-msg">All installers assigned to crews</p>
                  )}
                  {availableInstallers.filter(i => !i.leaveType).map((installer, index) => (
                    <Draggable
                      key={installer.id}
                      draggableId={installer.id}
                      index={index}
                      isDragDisabled={installer.leaveType != null}
                    >
                      {(provided, snapshot) => (
                        <InstallerCard
                          installer={installer}
                          provided={provided}
                          isDragging={snapshot.isDragging}
                          onToggleLeave={toggleLeave}
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {installers.some(i => i.leaveType) && (
              <div className="on-leave-section">
                <h3>On Leave ({installers.filter(i => i.leaveType).length})</h3>
                {installers.filter(i => i.leaveType).map(i => (
                  <div key={i.id} className={`leave-item ${i.leaveType}`}>
                    <span className="leave-item-name">{i.name}</span>
                    <span className="leave-type-tag">
                      {i.leaveType === 'annual' ? <><Palmtree size={12} /> Annual</> : <><Thermometer size={12} /> Sick</>}
                    </span>
                    <button className="leave-btn available" onClick={() => toggleLeave(i.id, null)} title="Mark Available">
                      <UserPlus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="crews-section">
            {crews.length === 0 && (
              <div className="empty-crews">
                <p>No crews yet. Click "New Crew" to get started.</p>
                <button className="btn btn-primary" onClick={addCrew}>
                  <Plus size={16} /> Create First Crew
                </button>
              </div>
            )}
            {crews.map((crew) => (
              <div key={crew.id} className="crew-card">
                <div className="crew-header">
                  <input
                    className="crew-name-input"
                    value={crew.name}
                    onChange={(e) => renameCrew(crew.id, e.target.value)}
                  />
                  <div className="crew-stats">
                    <span className="stat">
                      <strong>{crew.members.filter(m => !m.leaveType).length}</strong> members
                    </span>
                    <span className="stat">
                      Avg <strong>{getCrewAverage(crew)}</strong>
                    </span>
                    <span className="stat">
                      Total <strong>{getCrewTotal(crew)}</strong>
                    </span>
                  </div>
                  <button className="btn-icon" onClick={() => removeCrew(crew.id)} title="Remove Crew">
                    <X size={18} />
                  </button>
                </div>
                <Droppable droppableId={crew.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`crew-members ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                    >
                      {crew.members.length === 0 && (
                        <p className="empty-msg drop-hint">Drag installers here</p>
                      )}
                      {crew.members.map((member, index) => (
                        <Draggable key={member.id} draggableId={member.id} index={index}>
                          {(provided, snapshot) => (
                            <InstallerCard
                              installer={member}
                              provided={provided}
                              isDragging={snapshot.isDragging}
                              onToggleLeave={toggleLeave}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}
