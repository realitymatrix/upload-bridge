# Upload Bridge - Windows 11 styled approval dialog (WPF/XAML).
# Trusted-UI properties preserved:
#   - Rendered by local code; the agent cannot draw or click it.
#   - Deny is the default-focused button (Enter/Esc = Deny).
#   - All request data arrives Base64-encoded and is assigned to Text
#     properties AFTER XAML parsing - nothing user-controlled is parsed as markup.
# Output: "Yes" (approved) or "No" on stdout.

param(
    [Parameter(Mandatory)] [string]$f,   # Base64 UTF8: file path
    [Parameter(Mandatory)] [string]$s,   # size display string, e.g. "29 KB"
    [Parameter(Mandatory)] [string]$t    # Base64 UTF8: target field hint
)

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

$filePath = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($f))
$target   = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($t))
$fileName = [System.IO.Path]::GetFileName($filePath)

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Upload Bridge" WindowStartupLocation="CenterScreen" Topmost="True"
        WindowStyle="None" ResizeMode="NoResize" AllowsTransparency="True"
        Background="Transparent" SizeToContent="WidthAndHeight" ShowInTaskbar="True">
  <Window.Resources>
    <Style x:Key="Win11Button" TargetType="Button">
      <Setter Property="FontFamily" Value="Segoe UI Variable Text, Segoe UI"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="Padding" Value="22,9"/>
      <Setter Property="Margin" Value="8,0,0,0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="bd" CornerRadius="6" Background="{TemplateBinding Background}"
                    BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="1">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"
                                Margin="{TemplateBinding Padding}"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="bd" Property="Opacity" Value="0.9"/>
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

  <Border CornerRadius="12" Background="#F2202020" BorderBrush="#40FFFFFF" BorderThickness="1"
          Margin="24" MaxWidth="560">
    <Border.Effect>
      <DropShadowEffect BlurRadius="24" ShadowDepth="4" Opacity="0.5"/>
    </Border.Effect>
    <StackPanel Margin="28,24,28,24">

      <StackPanel Orientation="Horizontal" Margin="0,0,0,4">
        <TextBlock Text="&#xE72E;" FontFamily="Segoe MDL2 Assets" FontSize="22"
                   Foreground="#60CDFF" VerticalAlignment="Center" Margin="0,0,12,0"/>
        <StackPanel>
          <TextBlock Text="Human approval required" FontFamily="Segoe UI Variable Display, Segoe UI"
                     FontSize="18" FontWeight="SemiBold" Foreground="#FFFFFF"/>
          <TextBlock Text="An agent requests a file upload to a web form"
                     FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="12" Foreground="#A0A0A0"/>
        </StackPanel>
      </StackPanel>

      <Border Background="#15FFFFFF" CornerRadius="8" Padding="16,12" Margin="0,16,0,0">
        <StackPanel>
          <StackPanel Orientation="Horizontal">
            <TextBlock Text="&#xE7C3;" FontFamily="Segoe MDL2 Assets" FontSize="16"
                       Foreground="#60CDFF" VerticalAlignment="Center" Margin="0,0,10,0"/>
            <TextBlock x:Name="FileNameText" FontFamily="Segoe UI Variable Text, Segoe UI"
                       FontSize="14" FontWeight="SemiBold" Foreground="#FFFFFF"
                       TextWrapping="Wrap" MaxWidth="430"/>
          </StackPanel>
          <TextBlock x:Name="FilePathText" FontFamily="Segoe UI Variable Text, Segoe UI"
                     FontSize="11" Foreground="#909090" TextWrapping="Wrap"
                     Margin="26,4,0,0" MaxWidth="430"/>
          <StackPanel Orientation="Horizontal" Margin="26,10,0,0">
            <Border Background="#252D3A" CornerRadius="10" Padding="10,3" Margin="0,0,8,0">
              <TextBlock x:Name="SizeText" FontSize="11" Foreground="#60CDFF"
                         FontFamily="Segoe UI Variable Text, Segoe UI"/>
            </Border>
            <Border Background="#252D3A" CornerRadius="10" Padding="10,3">
              <TextBlock x:Name="TargetText" FontSize="11" Foreground="#60CDFF"
                         FontFamily="Segoe UI Variable Text, Segoe UI"/>
            </Border>
          </StackPanel>
        </StackPanel>
      </Border>

      <TextBlock Text="Only approve if you initiated this upload."
                 FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="12"
                 Foreground="#A0A0A0" Margin="2,14,0,0"/>

      <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,20,0,0">
        <Button x:Name="DenyBtn" Content="Deny" IsDefault="True" IsCancel="True"
                Style="{StaticResource Win11Button}" Background="#2D2D2D"
                BorderBrush="#454545" Foreground="#FFFFFF"/>
        <Button x:Name="ApproveBtn" Content="Approve upload"
                Style="{StaticResource Win11Button}" Background="#0067C0"
                BorderBrush="#0067C0" Foreground="#FFFFFF"/>
      </StackPanel>

    </StackPanel>
  </Border>
</Window>
'@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)

# User-controlled strings assigned AFTER parsing - never interpreted as XAML.
$window.FindName('FileNameText').Text = $fileName
$window.FindName('FilePathText').Text = $filePath
$window.FindName('SizeText').Text     = $s
$window.FindName('TargetText').Text   = "Target: $target"

$script:approved = $false
$window.FindName('ApproveBtn').Add_Click({ $script:approved = $true;  $window.Close() })
$window.FindName('DenyBtn').Add_Click({    $script:approved = $false; $window.Close() })

# Deny holds keyboard focus: Enter or Esc denies; approval requires deliberate action.
$window.Add_ContentRendered({ $window.FindName('DenyBtn').Focus() | Out-Null })

$window.ShowDialog() | Out-Null
if ($script:approved) { Write-Output 'Yes' } else { Write-Output 'No' }
