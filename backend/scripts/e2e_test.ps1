# langlearn P0 e2e verification (ASCII, safe for PS aliases)
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:3000/api'
$R = New-Object System.Random
$tag = $R.Next(1000,9999)
$email  = 'pilot' + $tag + '@lang.test'
$pass   = 'Passw0rd!'
$Script:Tok = $null
$Script:RT  = $null
$Script:UID = $null

function CallApi {
    param(
        [Parameter(Mandatory=$true,Position=0)][string]$Method,
        [Parameter(Mandatory=$true,Position=1)][string]$Path,
        [Parameter(Position=2)]$BodyObj = $null
    )
    $h = @{ 'Accept'='application/json' }
    if($Script:Tok){ $h['Authorization'] = 'Bearer ' + $Script:Tok }
    $p = $Base + '/' + $Path
    try {
        if($BodyObj -ne $null){
            $b = $BodyObj | ConvertTo-Json -Depth 10 -Compress
            $r = Invoke-WebRequest -Method $Method -Uri $p -Headers $h -UseBasicParsing -ContentType 'application/json' -Body $b
        } else {
            $r = Invoke-WebRequest -Method $Method -Uri $p -Headers $h -UseBasicParsing
        }
        return [pscustomobject]@{ ok=$true; status=$r.StatusCode; body=($r.Content | ConvertFrom-Json) }
    } catch {
        $resp = $_.Exception.Response
        $content = ''
        if($null -ne $resp){
            $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $content = $sr.ReadToEnd() ; $sr.Dispose()
        }
        $st = if($null -ne $resp){ [int]$resp.StatusCode } else { 0 }
        return [pscustomobject]@{ ok=$false; status=$st; body=$content }
    }
}

function CHECK {
    param($name,$o,$note='')
    $codeOK = ($null -ne $o.body) -and -not ($o.body -is [string]) -and ($o.body.PSObject.Properties.Name -contains 'code') -and ($o.body.code -eq 0)
    $good = $o.ok -and $codeOK
    $mark = if($good){ '[OK]' } else { '[FAIL]' }
    Write-Host "$mark $name status=$($o.status) $note"
    if(-not $good){
        $b = if($o.body -is [string]){ $o.body } else { ($o.body | ConvertTo-Json -Depth 6 -Compress) }
        Write-Host "   body=$b"
    }
}

Write-Host '== email=' $email '=='

$r = CallApi POST 'auth/register' ([pscustomobject]@{ email=$email; password=$pass })
CHECK '01_register_no_nickname' $r
if($r.ok -and $r.body.code -eq 0){
    $Script:Tok = $r.body.data.accessToken
    $Script:RT  = $r.body.data.refreshToken
    $Script:UID = $r.body.data.user.id
    Write-Host '   -> user.level=' $r.body.data.user.level ' expiresIn=' $r.body.data.expiresIn
}

$r = CallApi POST 'auth/login' ([pscustomobject]@{ email=$email; password=$pass })
CHECK '02_login' $r
if($r.ok -and $r.body.code -eq 0){
    $Script:Tok = $r.body.data.accessToken
    $Script:RT  = $r.body.data.refreshToken
}

$r = CallApi GET 'auth/me'
CHECK '03_auth_me_user_wrap' $r ('user_exists=' + [bool]$r.body.data.user)

$r = CallApi GET 'courses?language=en'
CHECK '04_courses_list' $r ('count=' + $r.body.data.Count)
$courseId = $r.body.data[0].id
Write-Host '   -> courseId=' $courseId ' totalLessons=' $r.body.data[0].totalLessons ' estHours=' $r.body.data[0].estimatedHours

$r = CallApi GET ('courses/' + $courseId)
CHECK '05_course_by_id' $r ('title=' + $r.body.data.title)

$r = CallApi GET ('courses/' + $courseId + '/lessons')
CHECK '06_lessons_list' $r ('lessonCount=' + $r.body.data.Count)
$lessonId = $r.body.data[0].id
$exerciseIds = $r.body.data[0].exerciseIds
Write-Host '   -> lesson=' $lessonId ' exIds=' ($exerciseIds -join ',')

$ex1 = $exerciseIds[0]
$r = CallApi GET ('learning/' + $ex1)
CHECK '07_exercise_detail_prompt' $r ('type=' + $r.body.data.type + ' promptLen=' + $r.body.data.prompt.Length)

$r = CallApi POST ('learning/' + $ex1 + '/submit') ([pscustomobject]@{ answer='WRONG_ANSWER_XYZ' })
CHECK '08_submit_wrong' $r ('correct=' + $r.body.data.correct + ' xp=' + $r.body.data.xpEarned + ' score=' + $r.body.data.score)
$correctAnswer = ''
if($r.ok -and $r.body.code -eq 0){ $correctAnswer = $r.body.data.correctAnswer; Write-Host '   -> correct=' $correctAnswer }

$r = CallApi POST ('learning/' + $ex1 + '/submit') ([pscustomobject]@{ answer=$correctAnswer })
CHECK '09_submit_correct' $r ('correct=' + $r.body.data.correct + ' xp=' + $r.body.data.xpEarned + ' masteryDelta=' + $r.body.data.masteryDelta)

$r = CallApi GET 'progress/dashboard'
CHECK '10_progress_dashboard' $r ('streak=' + $r.body.data.stats.streakDays + ' xp=' + $r.body.data.stats.totalXp + ' byLevelN=' + $r.body.data.byLevel.Count + ' coursesN=' + $r.body.data.coursesProgress.Count)

$r = CallApi GET 'progress/stats'
CHECK '11_progress_stats' $r

$r = CallApi GET 'progress/byLevel'
CHECK '12_progress_byLevel' $r

$r = CallApi GET 'progress/'
CHECK '13_progress_overview' $r ('courses=' + $r.body.data.Count)

$r = CallApi GET 'progress/recent?limit=5'
CHECK '14_progress_recent' $r ('items=' + $r.body.data.Count)

$r = CallApi GET "learning/vocabulary?level=A1&limit=5"
CHECK '15_vocabulary' $r ('count=' + $r.body.data.Count + ' trPopulated=' + [bool]$r.body.data[0].translation)

$r = CallApi GET "learning/listening?level=A1&limit=5"
CHECK '16_listening' $r ('count=' + $r.body.data.Count)

$r = CallApi POST 'auth/refresh' ([pscustomobject]@{ refreshToken=$Script:RT })
CHECK '17_auth_refresh' $r
if($r.ok -and $r.body.code -eq 0){ $Script:Tok = $r.body.data.accessToken; $Script:RT = $r.body.data.refreshToken }

$r = CallApi POST 'auth/logout' ([pscustomobject]@{ refreshToken=$Script:RT })
CHECK '18_auth_logout' $r

Write-Host '=== DONE ==='
