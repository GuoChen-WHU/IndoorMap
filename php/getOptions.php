<?php
	$DOCUMENT_ROOT = $_SERVER['DOCUMENT_ROOT'];
	$fp = fopen("$DOCUMENT_ROOT/IndoorMap/geojson/options.txt", 'rb');
	
	if (!$fp)
	{
		echo "<p><strong>Open options file failed.</strong></p></body></html>";
		exit;
	}
	
	$floorNum = fgetc($fp);
	
	fgets($fp);
	$i = 0;	
	while (!feof($fp))
	{
		$path = fgets($fp, 999);
		$sourcePaths[$i] = trim($path);
		$i++;
	}
	fclose($fp);
	ob_clean();
	header('Content-type:text/xml');
	echo 
"<?xml version=\"1.0\" ?>
	<option>
		<floorNum>$floorNum</floorNum>
		<sourcePaths>\r\n";
	foreach ($sourcePaths as $sourcePath) {
		echo "			<sourcePath>".$sourcePath."</sourcePath>\r\n";
	}
	echo "		</sourcePaths>
	</option>";
?>
