package com.promptsaver.keyboard.service

import android.inputmethodservice.InputMethodService
import android.os.Handler
import android.os.Looper
import android.view.View
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Backspace
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.MicOff
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.promptsaver.keyboard.R
import com.promptsaver.keyboard.ui.theme.PromptSaverKeyboardTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val qwertyLayout = listOf(
  listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p"),
  listOf("a", "s", "d", "f", "g", "h", "j", "k", "l"),
  listOf("⇧", "z", "x", "c", "v", "b", "n", "m", "⌫"),
)

private const val KEYBOARD_HEIGHT_DP = 264

internal enum class VoiceState {
  Idle,
  Recording,
  Processing,
  Muted,
}

class PromptSaverKeyboardService : InputMethodService() {

  private val mainHandler = Handler(Looper.getMainLooper())

  override fun onCreateInputView(): View {
    return ComposeView(this).apply {
      setContent {
        PromptSaverKeyboardTheme {
          Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 2.dp,
          ) {
            KeyboardScaffold(
              onText = { text -> currentInputConnection?.commitText(text, 1) },
              onBackspace = { currentInputConnection?.deleteSurroundingText(1, 0) },
              onShift = { /* TODO: wire casing + symbol layouts */ },
              onOpenSettings = { launchSettings() },
              onToggleLanguage = { switchToNextInputMethod() },
              onVoiceIntent = { state -> handleVoiceState(state) },
            )
          }
        }
      }
    }
  }

  private fun launchSettings() {
    sendDownUpKeyEvents(android.view.KeyEvent.KEYCODE_SETTINGS)
  }

  private fun switchToNextInputMethod() {
    try {
      val imeManager = currentInputMethodSubtype
      if (imeManager != null) {
        switchToNextInputMethod(false)
      }
    } catch (_: Throwable) {
      // Swallow: switching is best-effort to stay aligned with AOSP keyboards.
    }
  }

  private fun handleVoiceState(state: VoiceState) {
    // TODO: connect to foreground service that streams audio to Soniox.
    when (state) {
      VoiceState.Recording -> {
        // Placeholder: simulate a transcription round-trip.
        mainHandler.postDelayed({
          currentInputConnection?.commitText("Transcribed text placeholder", 1)
        }, 2_000)
      }
      VoiceState.Processing,
      VoiceState.Idle,
      VoiceState.Muted -> Unit
    }
  }
}

@Composable
private fun KeyboardScaffold(
  onText: (String) -> Unit,
  onBackspace: () -> Unit,
  onShift: () -> Unit,
  onOpenSettings: () -> Unit,
  onToggleLanguage: () -> Unit,
  onVoiceIntent: (VoiceState) -> Unit,
) {
  val voiceState = remember { mutableStateOf(VoiceState.Idle) }
  val scope = rememberCoroutineScope()

  Column(
    modifier = Modifier
      .fillMaxWidth()
      .height(KEYBOARD_HEIGHT_DP.dp)
      .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f))
      .padding(horizontal = 8.dp, vertical = 6.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    SuggestionStrip()
    KeyGrid(
      onText = onText,
      onBackspace = onBackspace,
      onShift = onShift,
      modifier = Modifier.weight(1f),
    )
    FunctionRow(
      voiceState = voiceState,
      onVoiceIntent = onVoiceIntent,
      onOpenSettings = onOpenSettings,
      onToggleLanguage = onToggleLanguage,
      scope = scope,
    )
  }
}

@Composable
private fun SuggestionStrip() {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .height(36.dp)
      .clip(RoundedCornerShape(18.dp))
      .background(MaterialTheme.colorScheme.surface)
      .border(
        width = 1.dp,
        color = MaterialTheme.colorScheme.outlineVariant,
        shape = RoundedCornerShape(18.dp),
      )
      .padding(horizontal = 12.dp),
    horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text(
      text = "Suggestions",
      style = MaterialTheme.typography.labelMedium,
      color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Spacer(modifier = Modifier.weight(1f))
    Dot()
    Dot()
    Dot()
  }
}

@Composable
private fun KeyGrid(
  modifier: Modifier = Modifier,
  onText: (String) -> Unit,
  onBackspace: () -> Unit,
  onShift: () -> Unit,
) {
  Column(
    modifier = modifier,
    verticalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    qwertyLayout.forEachIndexed { rowIndex, keys ->
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(horizontal = when (rowIndex) {
            0 -> 0.dp
            1 -> 12.dp
            else -> 24.dp
          }),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
      ) {
        keys.forEach { key ->
          when (key) {
            "⌫" -> IconKey(
              icon = Icons.Outlined.Backspace,
              contentDescription = stringResource(id = R.string.key_backspace),
              onClick = onBackspace,
            )
            "⇧" -> TextKey(
              label = key,
              weight = 1.35f,
              onPress = onShift,
            )
            else -> TextKey(
              label = key,
              onPress = { onText(key) },
            )
          }
        }
      }
    }
  }
}

@Composable
private fun TextKey(
  label: String,
  weight: Float = 1f,
  onPress: () -> Unit,
) {
  Box(
    modifier = Modifier
      .weight(weight)
      .aspectRatio(0.75f)
      .clip(RoundedCornerShape(10.dp))
      .background(MaterialTheme.colorScheme.surface)
      .border(
        width = 1.dp,
        color = MaterialTheme.colorScheme.outlineVariant,
        shape = RoundedCornerShape(10.dp),
      )
      .pointerInput(Unit) {
        detectTapGestures(onTap = { onPress() })
      },
    contentAlignment = Alignment.Center,
  ) {
    Text(
      text = label,
      fontSize = 18.sp,
      fontWeight = FontWeight.Medium,
      color = MaterialTheme.colorScheme.onSurface,
    )
  }
}

@Composable
private fun IconKey(
  icon: androidx.compose.ui.graphics.vector.ImageVector,
  contentDescription: String,
  weight: Float = 1.35f,
  onClick: () -> Unit,
) {
  Box(
    modifier = Modifier
      .weight(weight)
      .aspectRatio(0.75f)
      .clip(RoundedCornerShape(10.dp))
      .background(MaterialTheme.colorScheme.surface)
      .border(
        width = 1.dp,
        color = MaterialTheme.colorScheme.outlineVariant,
        shape = RoundedCornerShape(10.dp),
      )
      .pointerInput(Unit) {
        detectTapGestures(onTap = { onClick() })
      },
    contentAlignment = Alignment.Center,
  ) {
    Icon(
      imageVector = icon,
      contentDescription = contentDescription,
      tint = MaterialTheme.colorScheme.onSurface,
    )
  }
}

@Composable
private fun FunctionRow(
  voiceState: MutableState<VoiceState>,
  onVoiceIntent: (VoiceState) -> Unit,
  onOpenSettings: () -> Unit,
  onToggleLanguage: () -> Unit,
  scope: kotlinx.coroutines.CoroutineScope,
) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .height(56.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    PillButton(
      label = stringResource(id = R.string.key_settings),
      icon = Icons.Outlined.Settings,
      modifier = Modifier.weight(1f),
      onClick = onOpenSettings,
    )
    PillButton(
      label = stringResource(id = R.string.key_language),
      icon = Icons.Outlined.Language,
      modifier = Modifier.weight(1f),
      onClick = onToggleLanguage,
    )
    VoiceButton(
      state = voiceState.value,
      onStateChange = { newState ->
        voiceState.value = newState
        when (newState) {
          VoiceState.Recording -> {
            onVoiceIntent(VoiceState.Recording)
            scope.launch {
              delay(2_000)
              voiceState.value = VoiceState.Processing
              onVoiceIntent(VoiceState.Processing)
              delay(750)
              voiceState.value = VoiceState.Idle
              onVoiceIntent(VoiceState.Idle)
            }
          }
          VoiceState.Idle -> onVoiceIntent(VoiceState.Idle)
          VoiceState.Processing -> onVoiceIntent(VoiceState.Processing)
          VoiceState.Muted -> onVoiceIntent(VoiceState.Muted)
        }
      },
    )
  }
}

@Composable
private fun PillButton(
  label: String,
  icon: androidx.compose.ui.graphics.vector.ImageVector,
  modifier: Modifier = Modifier,
  onClick: () -> Unit,
) {
  Box(
    modifier = modifier
      .height(48.dp)
      .clip(RoundedCornerShape(14.dp))
      .background(MaterialTheme.colorScheme.surface)
      .border(
        width = 1.dp,
        color = MaterialTheme.colorScheme.outlineVariant,
        shape = RoundedCornerShape(14.dp),
      )
      .pointerInput(Unit) { detectTapGestures(onTap = { onClick() }) }
      .padding(horizontal = 16.dp),
    contentAlignment = Alignment.Center,
  ) {
    Row(
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Icon(
        imageVector = icon,
        contentDescription = label,
        tint = MaterialTheme.colorScheme.onSurfaceVariant,
      )
      Text(
        text = label,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
      )
    }
  }
}

@Composable
private fun VoiceButton(
  state: VoiceState,
  onStateChange: (VoiceState) -> Unit,
) {
  val surfaceColor = MaterialTheme.colorScheme.surface
  val accent = when (state) {
    VoiceState.Recording -> MaterialTheme.colorScheme.error
    VoiceState.Processing -> MaterialTheme.colorScheme.primary
    VoiceState.Muted -> MaterialTheme.colorScheme.onSurfaceVariant
    VoiceState.Idle -> MaterialTheme.colorScheme.primary
  }

  Box(
    modifier = Modifier
      .size(72.dp)
      .clip(RoundedCornerShape(24.dp))
      .background(surfaceColor)
      .border(
        width = 1.dp,
        color = MaterialTheme.colorScheme.outlineVariant,
        shape = RoundedCornerShape(24.dp),
      )
      .padding(8.dp)
      .pointerInput(state) {
        detectTapGestures(
          onTap = {
            val newState = when (state) {
              VoiceState.Idle -> VoiceState.Recording
              VoiceState.Recording -> VoiceState.Processing
              VoiceState.Processing -> VoiceState.Idle
              VoiceState.Muted -> VoiceState.Idle
            }
            onStateChange(newState)
          },
          onLongPress = { onStateChange(VoiceState.Muted) },
        )
      },
    contentAlignment = Alignment.Center,
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
      AnimatedContent(
        targetState = state,
        transitionSpec = {
          fadeIn(animationSpec = tween(180)) togetherWith fadeOut(animationSpec = tween(120))
        },
        label = "voice_icon",
      ) { animatedState ->
        when (animatedState) {
          VoiceState.Recording -> Icon(
            imageVector = Icons.Outlined.Mic,
            contentDescription = stringResource(id = R.string.key_voice_button_recording),
            tint = accent,
            modifier = Modifier.size(28.dp),
          )
          VoiceState.Processing -> Icon(
            imageVector = Icons.Outlined.Mic,
            contentDescription = stringResource(id = R.string.key_voice_button_processing),
            tint = accent,
            modifier = Modifier.size(28.dp),
          )
          VoiceState.Muted -> Icon(
            imageVector = Icons.Outlined.MicOff,
            contentDescription = stringResource(id = R.string.key_voice_button),
            tint = accent,
            modifier = Modifier.size(28.dp),
          )
          VoiceState.Idle -> Icon(
            imageVector = Icons.Outlined.Mic,
            contentDescription = stringResource(id = R.string.key_voice_button_idle),
            tint = accent,
            modifier = Modifier.size(28.dp),
          )
        }
      }
      Text(
        text = when (state) {
          VoiceState.Idle -> stringResource(id = R.string.key_voice_button_idle)
          VoiceState.Recording -> stringResource(id = R.string.key_voice_button_recording)
          VoiceState.Processing -> stringResource(id = R.string.key_voice_button_processing)
          VoiceState.Muted -> "Muted"
        },
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
      )
      Box(
        modifier = Modifier
          .size(width = 36.dp, height = 4.dp)
          .clip(CircleShape)
          .background(accent.copy(alpha = 0.3f)),
      )
    }
  }
}

@Composable
private fun Dot() {
  Box(
    modifier = Modifier
      .size(6.dp)
      .clip(CircleShape)
      .background(MaterialTheme.colorScheme.outlineVariant),
  )
}
