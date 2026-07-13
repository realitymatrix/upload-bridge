# Upload Bridge - native payment-authorization dialog (WPF/XAML).
# The consent plane for money movement: the OS, not the agent, renders the
# amount and payee. This is object-bound consent - the same shape PSD2 calls
# "dynamic linking" (authorization bound to the exact amount and exact payee,
# shown to the human at the moment of approval).
#
# Trusted-UI properties preserved from dialog.ps1:
#   - Rendered by local code; the agent cannot draw or click it.
#   - Deny is the default-focused button (Enter/Esc = Deny).
#   - Every field arrives Base64-encoded and is assigned to a Text property
#     AFTER XAML parsing - nothing agent-controlled is ever parsed as markup.
# Windows 11 look: real Mica backdrop + immersive dark mode via
# DwmSetWindowAttribute, system accent color, Segoe UI Variable.
# Output: "Yes" (approved) or "No" on stdout.

param(
    [Parameter(Mandatory)] [string]$amount,   # Base64 UTF8: display amount, e.g. "$4,000.00"
    [Parameter(Mandatory)] [string]$payee,    # Base64 UTF8: payee name
    [Parameter(Mandatory)] [string]$account,  # Base64 UTF8: destination account / identifier
    [Parameter(Mandatory)] [string]$memo      # Base64 UTF8: memo / reference
)

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class Dwm {
    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);
}
"@

function FromB64([string]$s) { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($s)) }
$amountText  = FromB64 $amount
$payeeText   = FromB64 $payee
$accountText = FromB64 $account
$memoText    = FromB64 $memo

# System accent color (ABGR dword in registry) with sensible fallback.
$accentHex = '#0067C0'
try {
    $abgr = (Get-ItemProperty 'HKCU:\SOFTWARE\Microsoft\Windows\DWM' -ErrorAction Stop).AccentColor
    if ($abgr) {
        $r = $abgr -band 0xFF; $g = ($abgr -shr 8) -band 0xFF; $b = ($abgr -shr 16) -band 0xFF
        $accentHex = ('#{0:X2}{1:X2}{2:X2}' -f $r, $g, $b)
    }
} catch { }

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Payment authorization" WindowStartupLocation="CenterScreen" Topmost="True"
        WindowStyle="SingleBorderWindow" ResizeMode="NoResize"
        Background="Transparent" SizeToContent="WidthAndHeight" ShowInTaskbar="True">
  <WindowChrome.WindowChrome>
    <WindowChrome CaptionHeight="0" GlassFrameThickness="-1" ResizeBorderThickness="0" CornerRadius="0"/>
  </WindowChrome.WindowChrome>
  <Window.Resources>
    <Style x:Key="FluentButton" TargetType="Button">
      <Setter Property="FontFamily" Value="Segoe UI Variable Text, Segoe UI"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="Padding" Value="22,9"/>
      <Setter Property="Margin" Value="8,0,0,0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="bd" CornerRadius="4" Background="{TemplateBinding Background}"
                    BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="1">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"
                                Margin="{TemplateBinding Padding}"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="bd" Property="Opacity" Value="0.92"/>
              </Trigger>
              <Trigger Property="IsPressed" Value="True">
                <Setter TargetName="bd" Property="Opacity" Value="0.8"/>
              </Trigger>
              <Trigger Property="IsKeyboardFocused" Value="True">
                <Setter TargetName="bd" Property="BorderBrush" Value="#FFFFFF"/>
                <Setter TargetName="bd" Property="BorderThickness" Value="2"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>

  <StackPanel Margin="32,28,32,18" MaxWidth="470">
    <!-- Header -->
    <StackPanel Orientation="Horizontal" Margin="0,0,0,2">
      <Border Width="40" Height="40" CornerRadius="8" x:Name="IconBadge" Margin="0,0,14,0">
        <TextBlock Text="&#xE8C7;" FontFamily="Segoe MDL2 Assets" FontSize="20"
                   Foreground="#FFFFFF" HorizontalAlignment="Center" VerticalAlignment="Center"/>
      </Border>
      <StackPanel VerticalAlignment="Center">
        <TextBlock Text="Authorize a payment" FontFamily="Segoe UI Variable Display, Segoe UI"
                   FontSize="20" FontWeight="SemiBold" Foreground="#FFFFFF"/>
        <TextBlock Text="An agent is requesting a money transfer"
                   FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="12" Foreground="#B0FFFFFF"/>
      </StackPanel>
    </StackPanel>

    <!-- Amount, the bound object, shown large -->
    <Border Background="#15FFFFFF" BorderBrush="#14FFFFFF" BorderThickness="1"
            CornerRadius="8" Padding="20,16" Margin="0,18,0,0">
      <StackPanel>
        <TextBlock Text="AMOUNT" FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="11"
                   Foreground="#90FFFFFF" FontWeight="SemiBold"/>
        <TextBlock x:Name="AmountText" FontFamily="Segoe UI Variable Display, Segoe UI"
                   FontSize="38" FontWeight="Bold" Foreground="#FFFFFF" Margin="0,2,0,0"/>
      </StackPanel>
    </Border>

    <!-- Payee -->
    <Border Background="#0FFFFFFF" BorderBrush="#14FFFFFF" BorderThickness="1"
            CornerRadius="8" Padding="16,12" Margin="0,10,0,0">
      <StackPanel>
        <TextBlock Text="TO PAYEE" FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="11"
                   Foreground="#90FFFFFF" FontWeight="SemiBold"/>
        <TextBlock x:Name="PayeeText" FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="16"
                   FontWeight="SemiBold" Foreground="#FFFFFF" TextWrapping="Wrap" Margin="0,2,0,0"/>
        <TextBlock x:Name="AccountText" FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="12"
                   Foreground="#60CDFF" TextWrapping="Wrap" Margin="0,3,0,0"/>
      </StackPanel>
    </Border>

    <!-- Memo -->
    <Border Background="#0FFFFFFF" BorderBrush="#14FFFFFF" BorderThickness="1"
            CornerRadius="8" Padding="16,12" Margin="0,10,0,0" x:Name="MemoCard">
      <StackPanel>
        <TextBlock Text="MEMO" FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="11"
                   Foreground="#90FFFFFF" FontWeight="SemiBold"/>
        <TextBlock x:Name="MemoText" FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="14"
                   Foreground="#E0FFFFFF" TextWrapping="Wrap" Margin="0,2,0,0"/>
      </StackPanel>
    </Border>

    <TextBlock Text="This transfer runs only if you approve it here. The amount and payee above are the real values that will be sent - not the agent's description."
               FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="12"
               Foreground="#A0FFFFFF" TextWrapping="Wrap" Margin="2,14,0,0"/>

    <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,18,0,0">
      <Button x:Name="DenyBtn" Content="Deny" IsDefault="True" IsCancel="True"
              Style="{StaticResource FluentButton}" Background="#20FFFFFF"
              BorderBrush="#30FFFFFF" Foreground="#FFFFFF"/>
      <Button x:Name="ApproveBtn" Content="Authorize transfer"
              Style="{StaticResource FluentButton}" Foreground="#FFFFFF"/>
    </StackPanel>
  </StackPanel>
</Window>
'@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)

# Real Windows 11 chrome: immersive dark mode (attr 20) + Mica backdrop (attr 38 = 2).
$window.add_SourceInitialized({
    $hwnd = (New-Object System.Windows.Interop.WindowInteropHelper($window)).Handle
    $dark = 1; [Dwm]::DwmSetWindowAttribute($hwnd, 20, [ref]$dark, 4) | Out-Null
    $mica = 2; [Dwm]::DwmSetWindowAttribute($hwnd, 38, [ref]$mica, 4) | Out-Null
})

$brushConv = [System.Windows.Media.BrushConverter]::new()
$accentBrush = $brushConv.ConvertFromString($accentHex)
$window.FindName('ApproveBtn').Background  = $accentBrush
$window.FindName('ApproveBtn').BorderBrush = $accentBrush
$window.FindName('IconBadge').Background   = $accentBrush

# Agent-controlled strings assigned AFTER parsing - never interpreted as XAML.
$window.FindName('AmountText').Text  = $amountText
$window.FindName('PayeeText').Text   = $payeeText
$window.FindName('AccountText').Text = $accountText
if ([string]::IsNullOrWhiteSpace($memoText)) {
    $window.FindName('MemoCard').Visibility = 'Collapsed'
} else {
    $window.FindName('MemoText').Text = $memoText
}

$script:approved = $false
$window.FindName('ApproveBtn').Add_Click({ $script:approved = $true;  $window.Close() })
$window.FindName('DenyBtn').Add_Click({    $script:approved = $false; $window.Close() })

# Deny holds keyboard focus: Enter or Esc denies; approval requires a deliberate click.
$window.Add_ContentRendered({ $window.FindName('DenyBtn').Focus() | Out-Null })

$window.ShowDialog() | Out-Null
if ($script:approved) { Write-Output 'Yes' } else { Write-Output 'No' }
