const { notarize } = require('@electron/notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization (not macOS)')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('⚠️  Skipping notarization: Apple credentials not found')
    console.warn('   Set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID environment variables')
    return
  }

  console.log(`🔐 Notarizing ${appPath}...`)
  console.log(`   Apple ID: ${appleId}`)
  console.log(`   Team ID: ${teamId}`)

  try {
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    })
    console.log('✅ Notarization successful!')
  } catch (error) {
    console.error('❌ Notarization failed:', error.message)

    // Don't fail the build if notarization fails
    // This allows the workflow to complete and create releases
    console.warn('⚠️  Continuing build despite notarization failure')
    console.warn('   The app will still be signed and functional')
    console.warn('   Users will see a Gatekeeper warning on first launch')
  }
}
