package com.promptsaver.keyboard.ui.theme

import android.os.Build
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.isSystemInDarkTheme

private val DarkColorPalette = darkColorScheme(
  primary = Color(0xFF4F46E5),
  secondary = Color(0xFF22D3EE),
  tertiary = Color(0xFF10B981),
  surface = Color(0xFF1F2937),
  surfaceVariant = Color(0xFF111827),
  outlineVariant = Color(0xFF374151),
)

private val LightColorPalette = lightColorScheme(
  primary = Color(0xFF4338CA),
  secondary = Color(0xFF0891B2),
  tertiary = Color(0xFF0EA5E9),
  surface = Color(0xFFF9FAFB),
  surfaceVariant = Color(0xFFE5E7EB),
  outlineVariant = Color(0xFFD1D5DB),
)

@Composable
fun PromptSaverKeyboardTheme(
  useDarkTheme: Boolean = isSystemInDarkTheme(),
  content: @Composable () -> Unit,
) {
  val context = LocalContext.current

  val palette =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      if (useDarkTheme) {
        dynamicDarkColorScheme(context)
      } else {
        dynamicLightColorScheme(context)
      }
    } else {
      if (useDarkTheme) DarkColorPalette else LightColorPalette
    }

  MaterialTheme(
    colorScheme = palette,
    typography = MaterialTheme.typography,
    content = content,
  )
}
