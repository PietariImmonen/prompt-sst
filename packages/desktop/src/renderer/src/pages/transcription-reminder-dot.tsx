const TranscriptionReminderDot = () => {
  const handleClick = () => {
    // Trigger transcription when dot is clicked
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('transcription:start-from-reminder')
    }
  }

  return (
    <div
      onClick={handleClick}
      role="presentation"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: '#ff0080',
        cursor: 'pointer',
        margin: 0,
        padding: 0
      }}
    />
  )
}

export default TranscriptionReminderDot
