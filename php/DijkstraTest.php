<?php
require_once 'vendor\autoload.php';

use Fhaculty\Graph\Graph;
use Fhaculty\Graph\Vertex;
use Graphp\Algorithms\ShortestPath\Dijkstra;

$graph = new Graph();
$v1 = $graph->createVertex(1);
$v2 = $graph->createVertex(2);
$v3 = $graph->createVertex(3);
$v4 = $graph->createVertex(4);

$e1 = $v1->createEdgeTo($v2)->setWeight(10);
$e2 = $v1->createEdgeTo($v3)->setWeight(10);
$e3 = $v2->createEdgeTo($v4)->setWeight(5);
$e4 = $v3->createEdgeTo($v4)->setWeight(7);

$alg = new Dijkstra($v4);

$walk = $alg->getWalkTo($v1);

$vertices = $walk->getVertices();

foreach ($vertices as $vertex)
{
	print_r ($vertex->getId());
	echo "<br/>";
}

?>
