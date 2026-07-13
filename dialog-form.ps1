# Upload Bridge - combined approval & question form.
# Native Windows 11 look: real Mica backdrop + immersive dark mode via
# DwmSetWindowAttribute, OS rounded corners/shadow, system accent color,
# Fluent typography (Segoe UI Variable) and 4px-radius controls.
# Trust properties: rendered by local code; file rows deny-by-default
# (unchecked); Esc cancels; no button holds default focus, so a stray Enter
# does nothing. All strings assigned to properties after construction.
# Input : -spec <Base64 UTF8 JSON> { title, items:[...] }
# Output: single-line JSON: { cancelled, files:{label:bool}, answers:{id:string} }

param([Parameter(Mandatory)] [string]$spec)

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class Dwm {
    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);
}
"@

$json = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($spec))
$data = $json | ConvertFrom-Json

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
        Title="Upload Bridge" WindowStartupLocation="CenterScreen" Topmost="True"
        WindowStyle="SingleBorderWindow" ResizeMode="NoResize"
        Background="Transparent" SizeToContent="WidthAndHeight" ShowInTaskbar="True">
  <WindowChrome.WindowChrome>
    <WindowChrome CaptionHeight="0" GlassFrameThickness="-1" ResizeBorderThickness="0" CornerRadius="0"/>
  </WindowChrome.WindowChrome>
  <Window.Resources>
    <Style x:Key="FluentButton" TargetType="Button">
      <Setter Property="FontFamily" Value="Segoe UI Variable Text, Segoe UI"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="Padding" Value="20,8"/>
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
    <Style TargetType="TextBox">
      <Setter Property="Background" Value="#0FFFFFFF"/>
      <Setter Property="Foreground" Value="#FFFFFF"/>
      <Setter Property="BorderBrush" Value="#26FFFFFF"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="Padding" Value="8,6"/>
      <Setter Property="FontFamily" Value="Segoe UI Variable Text, Segoe UI"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="CaretBrush" Value="#FFFFFF"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="TextBox">
            <Border CornerRadius="4" Background="{TemplateBinding Background}"
                    BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="{TemplateBinding BorderThickness}">
              <ScrollViewer x:Name="PART_ContentHost" Margin="{TemplateBinding Padding}"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsKeyboardFocused" Value="True">
                <Setter Property="BorderBrush" Value="#60CDFF"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <!-- Windows 11 Fluent radio: ring that thickens with accent when checked -->
    <Style TargetType="RadioButton">
      <Setter Property="Foreground" Value="#FFFFFF"/>
      <Setter Property="FontFamily" Value="Segoe UI Variable Text, Segoe UI"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="Margin" Value="0,10,0,0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="RadioButton">
            <Grid>
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="Auto"/><ColumnDefinition Width="*"/>
              </Grid.ColumnDefinitions>
              <Ellipse x:Name="ring" Width="20" Height="20" StrokeThickness="1.5"
                       Stroke="#8AFFFFFF" Fill="Transparent" VerticalAlignment="Center"/>
              <ContentPresenter Grid.Column="1" Margin="10,0,0,0" VerticalAlignment="Center"/>
            </Grid>
            <ControlTemplate.Triggers>
              <Trigger Property="IsChecked" Value="True">
                <Setter TargetName="ring" Property="Stroke" Value="{DynamicResource AccentBrush}"/>
                <Setter TargetName="ring" Property="StrokeThickness" Value="6"/>
              </Trigger>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="ring" Property="Fill" Value="#15FFFFFF"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <!-- Windows 11 Fluent checkbox: rounded box, accent fill + checkmark glyph -->
    <Style TargetType="CheckBox">
      <Setter Property="Foreground" Value="#FFFFFF"/>
      <Setter Property="FontFamily" Value="Segoe UI Variable Text, Segoe UI"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="CheckBox">
            <Grid>
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="Auto"/><ColumnDefinition Width="*"/>
              </Grid.ColumnDefinitions>
              <Border x:Name="box" Width="20" Height="20" CornerRadius="4" BorderThickness="1.5"
                      BorderBrush="#8AFFFFFF" Background="Transparent" VerticalAlignment="Top" Margin="0,2,0,0">
                <TextBlock x:Name="glyph" Text="&#xE73E;" FontFamily="Segoe MDL2 Assets" FontSize="12"
                           Foreground="#FFFFFF" HorizontalAlignment="Center" VerticalAlignment="Center"
                           Visibility="Collapsed"/>
              </Border>
              <ContentPresenter Grid.Column="1" Margin="12,0,0,0" VerticalAlignment="Top"/>
            </Grid>
            <ControlTemplate.Triggers>
              <Trigger Property="IsChecked" Value="True">
                <Setter TargetName="box" Property="Background" Value="{DynamicResource AccentBrush}"/>
                <Setter TargetName="box" Property="BorderBrush" Value="{DynamicResource AccentBrush}"/>
                <Setter TargetName="glyph" Property="Visibility" Value="Visible"/>
              </Trigger>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="box" Property="BorderBrush" Value="#C0FFFFFF"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>

  <StackPanel Margin="32,28,32,14" MaxWidth="620">
    <StackPanel Orientation="Horizontal" Margin="0,0,0,2">
      <Border Width="40" Height="40" CornerRadius="8" x:Name="IconBadge" Margin="0,0,14,0">
        <TextBlock Text="&#xE72E;" FontFamily="Segoe MDL2 Assets" FontSize="20"
                   Foreground="#FFFFFF" HorizontalAlignment="Center" VerticalAlignment="Center"/>
      </Border>
      <StackPanel VerticalAlignment="Center">
        <TextBlock x:Name="TitleText" FontFamily="Segoe UI Variable Display, Segoe UI"
                   FontSize="20" FontWeight="SemiBold" Foreground="#FFFFFF"/>
        <TextBlock Text="Review each item, then submit your decisions"
                   FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="12" Foreground="#B0FFFFFF"/>
      </StackPanel>
    </StackPanel>
    <ScrollViewer MaxHeight="640" VerticalScrollBarVisibility="Auto" Margin="0,14,0,0">
      <StackPanel x:Name="ItemsHost"/>
    </ScrollViewer>
    <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,16,0,0">
      <Button x:Name="CancelBtn" Content="Cancel" IsCancel="True" Style="{StaticResource FluentButton}"
              Background="#0FFFFFFF" BorderBrush="#26FFFFFF" Foreground="#FFFFFF"/>
      <Button x:Name="SubmitBtn" Content="Submit decisions" Style="{StaticResource FluentButton}"
              Foreground="#FFFFFF"/>
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
$window.Resources['AccentBrush'] = $accentBrush
$window.FindName('SubmitBtn').Background  = $accentBrush
$window.FindName('SubmitBtn').BorderBrush = $accentBrush
$window.FindName('IconBadge').Background  = $accentBrush
$window.FindName('TitleText').Text = if ($data.title) { [string]$data.title } else { 'Human approval required' }
$host_ = $window.FindName('ItemsHost')

function New-Card {
    $b = New-Object System.Windows.Controls.Border
    $b.Background   = $brushConv.ConvertFromString('#0FFFFFFF')
    $b.BorderBrush  = $brushConv.ConvertFromString('#14FFFFFF')
    $b.BorderThickness = [System.Windows.Thickness]::new(1)
    $b.CornerRadius = [System.Windows.CornerRadius]::new(8)
    $b.Padding      = [System.Windows.Thickness]::new(16, 14, 16, 14)
    $b.Margin       = [System.Windows.Thickness]::new(0, 8, 0, 0)
    $b
}
function New-Text([string]$t, [double]$size, [string]$color, [bool]$bold) {
    $tb = New-Object System.Windows.Controls.TextBlock
    $tb.Text = $t; $tb.FontSize = $size; $tb.TextWrapping = 'Wrap'
    $tb.FontFamily = [System.Windows.Media.FontFamily]::new('Segoe UI Variable Text, Segoe UI')
    $tb.Foreground = $brushConv.ConvertFromString($color)
    if ($bold) { $tb.FontWeight = 'SemiBold' }
    $tb
}

$fileChecks   = @{}
$choiceGroups = @{}
$textBoxes    = @{}

foreach ($item in $data.items) {
    $card = New-Card
    $stack = New-Object System.Windows.Controls.StackPanel
    $card.Child = $stack

    if ($item.kind -eq 'file') {
        $stack.Children.Add((New-Text "File upload - $($item.label)" 13 '#B0FFFFFF' $false)) | Out-Null
        $cb = New-Object System.Windows.Controls.CheckBox
        $cb.IsChecked = $false
        $cb.Margin = [System.Windows.Thickness]::new(0, 8, 0, 0)
        $inner = New-Object System.Windows.Controls.StackPanel
        $inner.Children.Add((New-Text ([System.IO.Path]::GetFileName([string]$item.path)) 15 '#FFFFFF' $true)) | Out-Null
        $inner.Children.Add((New-Text "$($item.size)  -  target: $($item.target)" 12 '#60CDFF' $false)) | Out-Null
        $inner.Children.Add((New-Text ([string]$item.path) 11 '#80FFFFFF' $false)) | Out-Null
        $cb.Content = $inner
        $stack.Children.Add($cb) | Out-Null
        $fileChecks[[string]$item.label] = $cb
    }
    elseif ($item.kind -eq 'choice') {
        $stack.Children.Add((New-Text ([string]$item.question) 15 '#FFFFFF' $true)) | Out-Null
        $radios = @()
        foreach ($opt in $item.options) {
            $rb = New-Object System.Windows.Controls.RadioButton
            $rb.Content = [string]$opt; $rb.GroupName = [string]$item.id
            $stack.Children.Add($rb) | Out-Null
            $radios += $rb
        }
        $other = $null
        if ($item.other) {
            $lbl = New-Text 'Other / notes (optional)' 12 '#B0FFFFFF' $false
            $lbl.Margin = [System.Windows.Thickness]::new(0, 10, 0, 0)
            $stack.Children.Add($lbl) | Out-Null
            $other = New-Object System.Windows.Controls.TextBox
            $other.MinHeight = 30
            $other.Margin = [System.Windows.Thickness]::new(0, 4, 0, 0)
            $stack.Children.Add($other) | Out-Null
        }
        $choiceGroups[[string]$item.id] = @{ radios = $radios; other = $other }
    }
    elseif ($item.kind -eq 'text') {
        $stack.Children.Add((New-Text ([string]$item.question) 15 '#FFFFFF' $true)) | Out-Null
        $tb = New-Object System.Windows.Controls.TextBox
        $tb.MinHeight = 30
        $tb.Margin = [System.Windows.Thickness]::new(0, 8, 0, 0)
        $tb.TextWrapping = 'Wrap'; $tb.AcceptsReturn = $true
        if ($item.value) { $tb.Text = [string]$item.value }
        $stack.Children.Add($tb) | Out-Null
        $textBoxes[[string]$item.id] = $tb
    }
    $host_.Children.Add($card) | Out-Null
}

$script:cancelled = $true
$window.FindName('SubmitBtn').Add_Click({ $script:cancelled = $false; $window.Close() })
$window.FindName('CancelBtn').Add_Click({ $script:cancelled = $true;  $window.Close() })
$window.ShowDialog() | Out-Null

$files = @{}
foreach ($k in $fileChecks.Keys) { $files[$k] = [bool]$fileChecks[$k].IsChecked -and -not $script:cancelled }
$answers = @{}
foreach ($k in $choiceGroups.Keys) {
    $g = $choiceGroups[$k]
    $sel = ($g.radios | Where-Object { $_.IsChecked }) | Select-Object -First 1
    $val = if ($sel) { [string]$sel.Content } else { '' }
    if ($g.other -and $g.other.Text.Trim()) { $val = if ($val) { "$val | Other: $($g.other.Text.Trim())" } else { "Other: $($g.other.Text.Trim())" } }
    $answers[$k] = $val
}
foreach ($k in $textBoxes.Keys) { $answers[$k] = $textBoxes[$k].Text }

@{ cancelled = [bool]$script:cancelled; files = $files; answers = $answers } |
    ConvertTo-Json -Compress -Depth 5 | Write-Output
