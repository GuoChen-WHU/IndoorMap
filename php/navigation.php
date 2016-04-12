<?php
require_once 'vendor\autoload.php';

use Fhaculty\Graph\Graph;
use Fhaculty\Graph\Vertex;
use Graphp\Algorithms\ShortestPath\Dijkstra;
use Fhaculty\Graph\Edge\Directed;

//先接受前端传来的起止点坐标
$x1 = $_POST['x1'];
$y1 = $_POST['y1'];
$x2 = $_POST['x2'];
$y2 = $_POST['y2'];

//建立到数据库qg_navpts的连接
$db = new mysqli('localhost', 'root', '', 'qg_navpts');

if (mysqli_connect_error())
{
	echo 'Error: Could not connect to database. Please try again later.';
	exit;
}

//查询得到所有导航点，添加到图里面
//遍历存储的过程中，顺便计算得到与起止点最近的导航点
$query = "select * from floor1_pts";
$allPoints = $db->query($query);

$graph = new Graph();

$pointNum = $allPoints->num_rows;
$minDistanceStartPointID = 0;//与起点最近的导航点ID
$minDistanceEndPointID = 0;
$minDistanceStart = 65535;//与起点最近的导航点和起点的距离
$minDistanceEnd = 65535;
for ($i = 0; $i < $pointNum; $i++)
{
	$pointData = $allPoints->fetch_assoc();
	$pointID = $pointData['pointNum'];
	$newVertex = $graph->createVertex($pointID);

	$x = $pointData['x'];
	$newVertex->setAttribute('x', $x);
	$y = $pointData['y'];
	$newVertex->setAttribute('y', $y);
	
	$distanceStart = ($x1 - $x) * ($x1 - $x) + ($y1 - $y) * ($y1 - $y);//当前点与起点的距离
	$distanceEnd = ($x2 - $x) * ($x2 - $x) + ($y2 - $y) * ($y2 - $y);
	if ($distanceStart < $minDistanceStart)
	{
		$minDistanceStart = $distanceStart;
		$minDistanceStartPointID = $pointID;
	}
	if ($distanceEnd < $minDistanceEnd)
	{
		$minDistanceEnd = $distanceEnd;
		$minDistanceEndPointID = $pointID;
	}
}
$allPoints->free();
//echo $minDistanceStartPointID." ".$minDistanceEndPointID." ".$minDistanceStart." ".$minDistanceEnd."<br/>";

//查询得到所有导航点的相邻关系，生成边存储到图里面
$query = "select * from floor1_adjpts";
$allEdges = $db->query($query);

$edgeNum = $allEdges->num_rows;
for ($i = 0; $i < $edgeNum; $i++)
{
	$edgeData = $allEdges->fetch_assoc();
	
	$firstPointId = $edgeData['pointNum1'];
	$secondPointId = $edgeData['pointNum2'];
	$edge1 = new Directed($graph->getVertex($firstPointId), $graph->getVertex($secondPointId));//这里用两个有向的边，而不是一个无向边，是因为库本身的问题（暂时不支持无向图的最短路径算法=_=） 
	$edge2 = new Directed($graph->getVertex($secondPointId), $graph->getVertex($firstPointId));
	
	$distance = (float)$edgeData['distance'];
	$edge1->setWeight($distance);
	$edge2->setWeight($distance);
	
//	echo $firstPointId." ".$secondPointId." ".$distance."<br/>";
}
$allEdges->free();
$db->close();
/*
$testVertices = $graph->getVertices();
foreach ($testVertices as $vertex)
{
	echo "<p>Point id=\"".$vertex->getId()."\" x=\"".$vertex->getAttribute('x')."\" y=\"".$vertex->getAttribute('y')."\"</p>";
}

$testEdges = $graph->getEdges();
foreach ($testEdges as $testEdge)
{
	$ver = $testEdge->getVertices();
	$firstNum = $ver->getVertexFirst()->getId();
	$secondNum = $ver->getVertexLast()->getId();
	echo "<p>Edge firstNum=".$firstNum." secondNum=".$secondNum." weight=".$testEdge->getWeight()."</p>";
}
*/


//寻找由 离起始点最近的导航点 到 离终点最近的导航点 的最短路径
$startPoint = $graph->getVertex($minDistanceStartPointID);
$endPoint = $graph->getVertex($minDistanceEndPointID);

$alg = new Dijkstra($startPoint);
/*$testEdges = $alg->getEdgesTo($endPoint);
$k = 0;
foreach ($testEdges as $testEdge)
{
	$k++;
	$ver = $testEdge->getVertices();
	$firstNum = $ver->getVertexFirst()->getId();
	$secondNum = $ver->getVertexLast()->getId();
	echo "<p>Edge id=$k firstNum=".$firstNum." secondNum=".$secondNum." weight=".$testEdge->getWeight()."</p>";
}
*/
$walk = $alg->getWalkTo($endPoint);

$vertices = $walk->getVertices();

//将导航结果传回前台
ob_clean();
header('Content-type:text/xml');
echo "<?xml version=\"1.0\"?>
		<Navigation_Points>
			<Point id=\"startPoint\" x=\"$x1\" y=\"$y1\"></Point>";
foreach ($vertices as $vertex)
{
	echo "<Point id=\"".$vertex->getId()."\" x=\"".$vertex->getAttribute('x')."\" y=\"".$vertex->getAttribute('y')."\"></Point>";
}
echo "<Point id=\"endPoint\" x=\"$x2\" y=\"$y2\"></Point>
	  </Navigation_Points>";

?>